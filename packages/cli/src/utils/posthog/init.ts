import { PostHog } from 'posthog-node';

const InitializedPostHog = new PostHog('phc_MrSAUUthn4y0PWjbxVt9a9ys7TrQKMQhdYvErJFPvE3', {
   host: 'https://eu.i.posthog.com',
});

export { InitializedPostHog };
