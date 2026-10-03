/**
 * Localhost-only loader for the Agentation feedback toolbar.
 *
 * Agentation is a React component, so it can't be dropped into the plain-HTML docs shell
 * directly. Shipping React to every visitor just to hide it in production would be wasteful, so
 * this tiny script runs first and only pulls in the heavy `agentation-app.js` bundle when the docs
 * are being viewed on a loopback host. Production visitors download this file alone.
 */

const hostname = window.location.hostname;
const isLoopback =
   hostname === 'localhost' ||
   hostname === '127.0.0.1' ||
   hostname === '::1' ||
   hostname === '[::1]' ||
   hostname.endsWith('.localhost');

if (isLoopback) {
   const script = document.createElement('script');
   script.src = '/assets/agentation-app.js';
   script.defer = true;
   document.head.appendChild(script);
}
