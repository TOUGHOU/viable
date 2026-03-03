/**
 * @file index.ts
 * @description Fiber 注入模块 - 将组件调用处的 data-f-id 回填到真实 DOM
 */

import { DATA_ATTRIBUTES } from '../../../shared/constants';
import { createLogger } from '../../../shared/utils';

interface FiberNode {
  child: FiberNode | null;
  sibling: FiberNode | null;
  return: FiberNode | null;
  stateNode?: unknown;
  pendingProps?: unknown;
  memoizedProps?: unknown;
}

type ReactContainerLike = {
  stateNode?: {
    current?: FiberNode | null;
  };
  current?: FiberNode | null;
};

export class FiberInjectorModule {
  private observer: MutationObserver | null = null;
  private rafId: number | null = null;
  private logger: ReturnType<typeof createLogger>;

  constructor(private debug: boolean = false) {
    this.logger = createLogger('FiberInjectorModule', debug);
  }

  init(): void {
    this.scheduleSync();
    this.observer = new MutationObserver(() => {
      this.scheduleSync();
    });
    if (document.documentElement) {
      this.observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    }
    this.logger.log('Fiber injector initialized');
  }

  destroy(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.logger.log('Fiber injector destroyed');
  }

  private scheduleSync(): void {
    if (this.rafId !== null) {
      return;
    }
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.syncToDom();
    });
  }

  private syncToDom(): void {
    const roots = this.collectReactRootFibers();
    if (roots.length === 0) {
      return;
    }
    let appliedCount = 0;
    roots.forEach((rootFiber) => {
      appliedCount += this.injectRootFiber(rootFiber);
    });
    if (appliedCount > 0) {
      this.logger.log('Applied data-f-id to DOM nodes:', appliedCount);
    }
  }

  private collectReactRootFibers(): FiberNode[] {
    const roots: FiberNode[] = [];
    const seen = new Set<FiberNode>();

    const addRootFromNode = (node: Element | null): void => {
      if (!node) {
        return;
      }
      const rootFiber = this.getRootFiberFromNode(node);
      if (rootFiber && !seen.has(rootFiber)) {
        seen.add(rootFiber);
        roots.push(rootFiber);
      }
    };

    const nodes: (Element | null)[] = [document.getElementById('__next'), document.body];
    nodes.forEach((node) => addRootFromNode(node));

    return roots;
  }

  private getRootFiberFromNode(node: Element): FiberNode | null {
    const props = Object.getOwnPropertyNames(node);
    for (const key of props) {
      if (!key.startsWith('__reactContainer$')) {
        continue;
      }
      const value = (node as unknown as Record<string, unknown>)[key];
      const rootFiber = this.extractRootFiber(value);
      if (rootFiber) {
        return rootFiber;
      }
    }
    return null;
  }

  private extractRootFiber(value: unknown): FiberNode | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    const container = value as ReactContainerLike;
    if (container.stateNode?.current) {
      return container.stateNode.current;
    }
    if (container.current) {
      return container.current;
    }
    return this.isFiberNode(value) ? value : null;
  }

  private injectRootFiber(rootFiber: FiberNode): number {
    const stack: FiberNode[] = [rootFiber];
    let appliedCount = 0;

    while (stack.length > 0) {
      const current = stack.pop()!;
      const componentId = this.getFiberComponentId(current);

      if (componentId && !this.hasTaggedAncestor(current)) {
        const hostElement = this.findFirstHostElement(current);
        if (hostElement && hostElement.getAttribute(DATA_ATTRIBUTES.F_ID) !== componentId) {
          hostElement.setAttribute(DATA_ATTRIBUTES.F_ID, componentId);
          appliedCount++;
        }
      }

      let child = current.child;
      while (child) {
        stack.push(child);
        child = child.sibling;
      }
    }
    return appliedCount;
  }

  private getFiberComponentId(fiber: FiberNode): string | null {
    const fromPending = this.getIdFromProps(fiber.pendingProps);
    if (fromPending) {
      return fromPending;
    }
    return this.getIdFromProps(fiber.memoizedProps);
  }

  private getIdFromProps(props: unknown): string | null {
    if (!props || typeof props !== 'object') {
      return null;
    }
    const fId = (props as Record<string, unknown>)[DATA_ATTRIBUTES.F_ID];
    if (typeof fId === 'string' && fId.length > 0) {
      return fId;
    }
    return null;
  }

  private hasTaggedAncestor(fiber: FiberNode): boolean {
    let parent = fiber.return;
    while (parent) {
      if (this.getFiberComponentId(parent)) {
        return true;
      }
      parent = parent.return;
    }
    return false;
  }

  private findFirstHostElement(startFiber: FiberNode): Element | null {
    const stack: FiberNode[] = [startFiber];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (this.isElementStateNode(current.stateNode)) {
        return current.stateNode;
      }
      let child = current.child;
      while (child) {
        stack.push(child);
        child = child.sibling;
      }
    }
    return null;
  }

  private isFiberNode(value: unknown): value is FiberNode {
    if (!value || typeof value !== 'object') {
      return false;
    }
    return 'child' in value && 'sibling' in value && 'return' in value;
  }

  private isElementStateNode(value: unknown): value is Element {
    return value instanceof Element;
  }
}
