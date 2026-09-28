import { CloudTasksClient } from '@google-cloud/tasks';

/**
 * Service to enqueue social media posting jobs.
 * Enqueues to Google Cloud Tasks in production.
 * Falls back to an asynchronous local HTTP trigger in development.
 */
export async function enqueueSocialPostTask(articleId: string): Promise<void> {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;
  const location = process.env.GCP_LOCATION || 'asia-south1'; // Default matching deploy scripts
  const queue = 'social-posting-queue';
  const backendUrl = process.env.BACKEND_SERVICE_URL; // e.g. https://india-report-backend-xyz.run.app

  const isProduction = process.env.NODE_ENV === 'production' && projectId && backendUrl;

  if (isProduction) {
    console.log(`[TaskService] Enqueuing Cloud Task for article: ${articleId}`);
    try {
      const client = new CloudTasksClient();
      const queuePath = client.queuePath(projectId!, location, queue);
      const url = `${backendUrl}/api/social/publish-article`;

      const task = {
        httpRequest: {
          httpMethod: 'POST' as const,
          url,
          headers: {
            'Content-Type': 'application/json',
          },
          body: Buffer.from(JSON.stringify({ articleId })).toString('base64'),
          // Optional: add OIDC token for secure backend authentication
          oidcToken: {
            serviceAccountEmail: process.env.GCP_SA_EMAIL || `${projectId}@appspot.gserviceaccount.com`,
          },
        },
      };

      await client.createTask({ parent: queuePath, task });
      console.log(`[TaskService] Successfully enqueued Cloud Task for article ${articleId}`);
    } catch (error) {
      console.error(`[TaskService] Failed to enqueue Cloud Task for article ${articleId}:`, error);
      // Fallback to local background triggering on failure so we don't completely lose the post
      triggerLocalMockTask(articleId);
    }
  } else {
    // Local / Sandbox Mode
    console.log(`[TaskService] Local mode: Simulating queue task for article: ${articleId}`);
    triggerLocalMockTask(articleId);
  }
}

/**
 * Simulates a task queue locally by invoking the backend endpoint asynchronously.
 */
function triggerLocalMockTask(articleId: string) {
  const port = process.env.SOCIAL_PORT || '8090';
  const localUrl = `http://localhost:${port}/api/social/publish-article`;

  // Run asynchronously without blocking the current thread
  setTimeout(async () => {
    try {
      console.log(`[TaskService] [Local Queue Simulation] Triggering: POST ${localUrl} for article ${articleId}`);
      const response = await fetch(localUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Header bypass for authentication in local mode
          'x-bypass-auth': 'true'
        },
        body: JSON.stringify({ articleId })
      });

      if (response.ok) {
        console.log(`[TaskService] [Local Queue Simulation] Task finished with status: ${response.status}`);
      } else {
        console.error(`[TaskService] [Local Queue Simulation] Task failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error(`[TaskService] [Local Queue Simulation] Error calling local endpoint:`, error);
    }
  }, 3000); // 3-second delay to simulate network/queue delay
}
