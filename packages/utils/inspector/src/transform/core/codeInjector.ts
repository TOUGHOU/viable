/**
 * @file codeInjector.ts
 * @description 代码注入器 - 向 JSX 元素注入调试属性
 */

import type { NodePath } from '@babel/traverse';
import traverseModule from '@babel/traverse';
import type { File, JSXElement, JSXIdentifier, JSXMemberExpression, JSXNamespacedName } from '@babel/types';
import MagicString from 'magic-string';
import { DEFAULT_CONFIG } from '../../shared/config';
import { NAME_SPACE } from '../../shared/constants';
import type { TransformContext } from '../../shared/types';

const traverse = (traverseModule as unknown as { default: typeof traverseModule }).default || traverseModule;

interface InjectionOptions {
  includeElements?: string[];
  excludeElements?: string[];
}

type JSXElementName = JSXIdentifier | JSXMemberExpression | JSXNamespacedName;

export class CodeInjector {
  constructor(private options: InjectionOptions = {}) {}

  inject(
    code: string,
    ast: File,
    context: TransformContext,
  ): { code: string; map: ReturnType<MagicString['generateMap']> } | null {
    const magicString = new MagicString(code);
    let changedElementsCount = 0;

    traverse(ast, {
      JSXElement: (path: NodePath<JSXElement>) => {
        const openingElement = path.node.openingElement;
        const elementName = this.getElementName(openingElement.name);

        if (!elementName) {
          return;
        }

        if (!this.shouldTagElement(elementName)) {
          return;
        }

        const isComponent = this.isReactComponent(elementName);
        const elementType = isComponent ? 'component' : 'element';
        const line = openingElement.loc?.start?.line ?? 0;
        const col = openingElement.loc?.start?.column ?? 0;
        const dataComponentId = `${context.relativePath}:${line}:${col}`;

        const injectedAttrs = [
          `data-${NAME_SPACE}-id="${dataComponentId}"`,
          `data-${NAME_SPACE}-name="${elementName}"`,
          `data-${NAME_SPACE}-type="${elementType}"`,
          `data-${NAME_SPACE}-path="${context.relativePath}"`,
          `data-${NAME_SPACE}-line="${line}"`,
          `data-${NAME_SPACE}-col="${col}"`,
          `data-${NAME_SPACE}-file="${context.fileName}"`,
        ];

        if (isComponent && this.isFirstLevelComponentCall(path)) {
          const fid = `${context.relativePath}:${line}:${col}:${elementName}`;
          injectedAttrs.push(`data-f-id="${fid}"`);
        }

        const componentRootPropsName = this.getComponentRootPropsName(path, elementName);
        if (componentRootPropsName != null) {
          injectedAttrs.push(`data-f-id={${componentRootPropsName}['data-f-id']}`);
        }

        magicString.appendLeft(openingElement.name.end ?? 0, ` ${injectedAttrs.join(' ')}`);
        changedElementsCount++;
      },
    });

    if (changedElementsCount === 0) {
      return null;
    }

    return {
      code: magicString.toString(),
      map: magicString.generateMap({ hires: true }),
    };
  }

  private getElementName(jsxName: JSXElementName): string | null {
    if (jsxName.type === 'JSXIdentifier') {
      return jsxName.name;
    }
    if (jsxName.type === 'JSXMemberExpression') {
      const objPart = this.getElementName(jsxName.object);
      return objPart != null ? `${objPart}.${jsxName.property.name}` : null;
    }
    if (jsxName.type === 'JSXNamespacedName') {
      return `${jsxName.namespace.name}:${jsxName.name.name}`;
    }
    return null;
  }

  private isReactComponent(elementName: string): boolean {
    const firstPart = elementName.split('.')[0];
    return /^[A-Z]/.test(firstPart);
  }

  private shouldTagElement(elementName: string): boolean {
    const { includeElements, excludeElements = DEFAULT_CONFIG.transform.excludeElements } = this.options;
    if (excludeElements?.includes(elementName)) {
      return false;
    }
    if (includeElements && includeElements.length > 0) {
      return includeElements.includes(elementName);
    }
    return true;
  }

  private isFirstLevelComponentCall(path: NodePath<JSXElement>): boolean {
    const nearestJsxAncestor = path.findParent((p: NodePath): boolean => p.isJSXElement() || p.isJSXFragment());

    if (!nearestJsxAncestor) {
      return false;
    }

    if (nearestJsxAncestor.isJSXElement()) {
      const parentName = this.getElementName(nearestJsxAncestor.node.openingElement.name);
      if (!parentName || this.isReactComponent(parentName)) {
        return false;
      }
    }

    const upperAncestor = nearestJsxAncestor.findParent(
      (p: NodePath): boolean => p.isJSXElement() || p.isJSXFragment(),
    );
    return !upperAncestor;
  }

  private getComponentRootPropsName(path: NodePath<JSXElement>, _elementName: string): string | null {
    const returnPath = path.findParent((p: NodePath): boolean => p.isReturnStatement());
    if (!returnPath?.isReturnStatement()) {
      return null;
    }

    const returnArg = returnPath.node.argument;
    const isDirectReturn = returnArg === path.node;
    const isParenthesizedReturn = returnArg?.type === 'ParenthesizedExpression' && returnArg.expression === path.node;
    if (!isDirectReturn && !isParenthesizedReturn) {
      return null;
    }

    const fnPath = path.getFunctionParent();
    if (!fnPath?.node || (fnPath.node.params?.length ?? 0) === 0) {
      return null;
    }

    const firstParam = fnPath.node.params[0];
    if (firstParam?.type !== 'Identifier') {
      return null;
    }

    return firstParam.name;
  }
}
