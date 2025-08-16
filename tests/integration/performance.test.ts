/**
 * Performance and load testing for the MCP RESTful API Server
 */

import { ApiClient } from "../../src/client";
import { NoAuthHandler } from "../../src/auth";
import { ServerConfig } from "../../src/config";

describe("Performance Integration Tests", () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    const config: ServerConfig = {
      baseUrl: "https://jsonplaceholder.typicode.com",
      authType: "none",
    };
    const authHandler = new NoAuthHandler();
    apiClient = new ApiClient(config, authHandler);
  });

  describe("Concurrent Request Performance", () => {
    test("should handle 10 concurrent GET requests efficiently", async () => {
      const startTime = Date.now();

      const concurrentRequests = Array.from({ length: 10 }, (_, i) => apiClient.get({ path: `/posts/${i + 1}` }));

      const responses = await Promise.all(concurrentRequests);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.success).toBe(true);
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty("id", index + 1);
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds max

      // Log performance metrics only if VERBOSE_TESTS is set
      if (process.env["VERBOSE_TESTS"] === "true") {
        console.log(`10 concurrent GET requests completed in ${duration}ms`);
      }
    });

    test("should handle mixed concurrent operations", async () => {
      const startTime = Date.now();

      const mixedRequests = [
        // GET requests
        apiClient.get({ path: "/posts/1" }),
        apiClient.get({ path: "/posts/2" }),
        apiClient.get({ path: "/posts/3" }),

        // POST requests
        apiClient.post({
          path: "/posts",
          body: {
            title: "Performance Test Post 1",
            body: "This is performance test post number 1",
            userId: 1,
          },
        }),
        apiClient.post({
          path: "/posts",
          body: {
            title: "Performance Test Post 2",
            body: "This is performance test post number 2",
            userId: 1,
          },
        }),

        // PUT request
        apiClient.put({
          path: "/posts/1",
          body: {
            id: 1,
            title: "Updated Performance Test Post",
            body: "This post has been updated during performance testing",
            userId: 1,
          },
        }),

        // PATCH request
        apiClient.patch({
          path: "/posts/1",
          body: {
            title: "Patched Performance Test Post",
          },
        }),

        // DELETE request
        apiClient.delete({ path: "/posts/1" }),
      ];

      const responses = await Promise.all(mixedRequests);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.success).toBe(true);
        expect([200, 201].includes(response.status)).toBe(true);
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds max

      if (process.env["VERBOSE_TESTS"] === "true") {
        console.log(`8 mixed concurrent requests completed in ${duration}ms`);
      }
    });

    test("should handle high concurrency (25 requests)", async () => {
      const startTime = Date.now();

      const highConcurrencyRequests = Array.from(
        { length: 25 },
        (_, i) => apiClient.get({ path: `/posts/${(i % 100) + 1}` }), // Cycle through posts 1-100
      );

      const responses = await Promise.all(highConcurrencyRequests);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Count successful requests
      const successfulRequests = responses.filter(r => r.success);
      const failedRequests = responses.filter(r => !r.success);

      // Most requests should succeed (allow for some rate limiting)
      expect(successfulRequests.length).toBeGreaterThan(20);

      // If any failed, they should be due to rate limiting or network issues
      failedRequests.forEach(response => {
        expect([429, 500, 502, 503].includes(response.status) || response.error?.match(/timeout|network|connection/i)).toBeTruthy();
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(15000); // 15 seconds max

      if (process.env["VERBOSE_TESTS"] === "true") {
        console.log(`25 concurrent requests: ${successfulRequests.length} succeeded, ${failedRequests.length} failed in ${duration}ms`);
      }
    });
  });

  describe("Sequential vs Concurrent Performance Comparison", () => {
    test("should demonstrate performance improvement with concurrent requests", async () => {
      const requestCount = 5;
      const testPosts = Array.from({ length: requestCount }, (_, i) => i + 1);

      // Sequential requests
      const sequentialStartTime = Date.now();
      const sequentialResponses = [];
      for (const postId of testPosts) {
        const response = await apiClient.get({ path: `/posts/${postId}` });
        sequentialResponses.push(response);
      }
      const sequentialEndTime = Date.now();
      const sequentialDuration = sequentialEndTime - sequentialStartTime;

      // Concurrent requests
      const concurrentStartTime = Date.now();
      const concurrentRequests = testPosts.map(postId => apiClient.get({ path: `/posts/${postId}` }));
      const concurrentResponses = await Promise.all(concurrentRequests);
      const concurrentEndTime = Date.now();
      const concurrentDuration = concurrentEndTime - concurrentStartTime;

      // Both should have same success rate
      const sequentialSuccesses = sequentialResponses.filter(r => r.success).length;
      const concurrentSuccesses = concurrentResponses.filter(r => r.success).length;

      expect(sequentialSuccesses).toBe(requestCount);
      expect(concurrentSuccesses).toBe(requestCount);

      // Concurrent should be faster (allow some margin for network variability)
      expect(concurrentDuration).toBeLessThan(sequentialDuration * 0.9);

      if (process.env["VERBOSE_TESTS"] === "true") {
        console.log(`Sequential: ${sequentialDuration}ms, Concurrent: ${concurrentDuration}ms`);
        console.log(`Performance improvement: ${(((sequentialDuration - concurrentDuration) / sequentialDuration) * 100).toFixed(1)}%`);
      }
    });
  });

  describe("Memory and Resource Usage", () => {
    test("should handle large response payloads efficiently", async () => {
      const startTime = Date.now();
      const initialMemory = process.memoryUsage();

      // Get all posts (should be ~100 posts with full content)
      const response = await apiClient.get({ path: "/posts" });

      const endTime = Date.now();
      const finalMemory = process.memoryUsage();
      const duration = endTime - startTime;

      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(50);

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000);

      // Memory usage should not increase dramatically
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase

      if (process.env["VERBOSE_TESTS"] === "true") {
        console.log(`Large payload (${response.data.length} posts) processed in ${duration}ms`);
        console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      }
    });
  });

  describe("Error Recovery Performance", () => {
    test("should recover quickly from error conditions", async () => {
      interface RecoveryTest {
        type: string;
        duration: number;
      }
      const recoveryTests: RecoveryTest[] = [];

      // Test recovery from 404 errors
      const start404 = Date.now();
      await apiClient.get({ path: "/posts/999999" }); // Should fail
      const recovery404 = await apiClient.get({ path: "/posts/1" }); // Should succeed
      const end404 = Date.now();

      expect(recovery404.success).toBe(true);
      recoveryTests.push({ type: "404 recovery", duration: end404 - start404 });

      // All recovery tests should complete quickly
      recoveryTests.forEach(test => {
        expect(test.duration).toBeLessThan(3000); // 3 seconds max
        if (process.env["VERBOSE_TESTS"] === "true") {
          console.log(`${test.type}: ${test.duration}ms`);
        }
      });
    });
  });
});
