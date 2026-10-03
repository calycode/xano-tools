import { Agentation, type AgentationProps } from 'agentation';
import { createElement, type FunctionComponent } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * Mounts the Agentation toolbar into the static docs shell.
 *
 * Loaded on demand by `agentation-loader.ts` on loopback hosts only. Pointed at the default
 * Agentation MCP port so annotations sync to a locally running `agentation-mcp server`; without a
 * server the toolbar still works and feedback is copied manually. `appName` labels the source in
 * copied and submitted notes.
 */

const Toolbar = Agentation as unknown as FunctionComponent<AgentationProps>;

function mount(): void {
   const host = document.createElement('div');
   host.id = 'agentation-root';
   document.body.appendChild(host);
   createRoot(host).render(
      createElement(Toolbar, {
         appName: '@calycode/cli Docs',
         endpoint: 'http://localhost:4747',
      })
   );
}

if (document.readyState === 'loading') {
   document.addEventListener('DOMContentLoaded', mount);
} else {
   mount();
}
