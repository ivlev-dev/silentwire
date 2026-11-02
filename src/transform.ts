import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import type { NodePath } from "@babel/traverse";
import MagicString from "magic-string";
import * as t from "@babel/types";
import * as path from "node:path";
import {
  jsString,
  modulePathWithoutExtension,
  relativeModuleSpecifier,
  stripExtension,
} from "./utils.js";

export interface TransformResult {
  code: string;
  map: any;
  changed: boolean;
}

interface ImportInfo {
  typeOnly: boolean;
  specifierTypeOnly: boolean;
  kind: "value" | "namespace" | "default";
  source: string;
}

interface ConstructorParamInfo {
  typeExpression: string;
  injectedExpression: string;
  resolvable: boolean;
}

import type { Index } from "./scanner.js";

const PRIMITIVE_TYPES = new Set([
  "string", "number", "boolean", "void", "unknown", "any", "never",
  "null", "undefined", "bigint", "symbol", "object",
]);

function withoutExt(p: string) {
  const slash = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  const dot = p.lastIndexOf(".");
  if (dot > slash) return p.slice(0, dot);
  return p;
}

function parseTypeExpression(node: any): string | null {
  if (!node || node.type !== "TSTypeReference") return null;
  if (node.typeParameters) return null;

  const typeName = node.typeName;
  if (typeName?.type === "Identifier") {
    if (PRIMITIVE_TYPES.has(typeName.name)) return null;
    return typeName.name;
  }
  if (typeName?.type === "TSQualifiedName") {
    const left = typeName.left?.name;
    const right = typeName.right?.name;
    if (!left || !right) return null;
    if (PRIMITIVE_TYPES.has(left)) return null;
    return `${left}.${right}`;
  }
  return null;
}

function collectImports(ast: any) {
  const imports = new Map<string, ImportInfo>();
  const interfaces = new Set<string>();
  const typeAliases = new Set<string>();

  traverse(ast, {
    ImportDeclaration(path: NodePath<any>) {
      const stmtTypeOnly = Boolean(path.node.typeOnly || path.node.importKind === "type");
      const source = String(path.node.source?.value ?? "");
      for (const spec of path.node.specifiers ?? []) {
        const specTypeOnly =
          stmtTypeOnly || spec.importKind === "type" || Boolean(spec.isTypeOnly);
        if (spec.type === "ImportSpecifier") {
          imports.set(spec.local.name, {
            typeOnly: specTypeOnly,
            specifierTypeOnly: spec.importKind === "type" || Boolean(spec.isTypeOnly),
            kind: "value",
            source,
          });
        } else if (spec.type === "ImportDefaultSpecifier") {
          imports.set(spec.local.name, {
            typeOnly: specTypeOnly,
            specifierTypeOnly: false,
            kind: "default",
            source,
          });
        } else if (spec.type === "ImportNamespaceSpecifier") {
          imports.set(spec.local.name, {
            typeOnly: specTypeOnly,
            specifierTypeOnly: false,
            kind: "namespace",
            source,
          });
        }
      }
    },
    TSInterfaceDeclaration(path: NodePath<any>) {
      if (path.node.id?.name) interfaces.add(path.node.id.name);
    },
    TSTypeAliasDeclaration(path: NodePath<any>) {
      if (path.node.id?.name) typeAliases.add(path.node.id.name);
    },
  });

  return { imports, interfaces, typeAliases };
}

function getConstructorParams(classNode: any): ConstructorParamInfo[] | null {
  const constructors = (classNode.body?.body ?? []).filter(
    (m: any) => m.type === "ClassMethod" && m.kind === "constructor"
  );
  if (constructors.length === 0) return [];

  const ctor = [...constructors].reverse().find((m: any) => m.body) ?? constructors[constructors.length - 1];
  const params: ConstructorParamInfo[] = [];

  for (const param of ctor.params ?? []) {
    let target = param;
    if (target.type === "TSParameterProperty") target = target.parameter;
    if (target.type === "AssignmentPattern") target = target.left;
    if (target.type !== "Identifier") return null;

    const typeNode = target.typeAnnotation?.typeAnnotation;
    const typeExpression = parseTypeExpression(typeNode);
    if (!typeExpression) return null;

    params.push({
      typeExpression,
      injectedExpression: typeExpression,
      resolvable: true,
    });
  }
  return params;
}

function isResolvableType(
  typeExpression: string,
  imports: Map<string, ImportInfo>,
  interfaces: Set<string>,
  typeAliases: Set<string>
) {
  const base = typeExpression.split(".")[0];
  if (interfaces.has(base)) return true;
  if (typeAliases.has(base)) return false;

  const importInfo = imports.get(base);
  if (importInfo?.typeOnly || importInfo?.specifierTypeOnly) return true;
  if (importInfo) return true;

  if (PRIMITIVE_TYPES.has(base)) return false;
  return true;
}

function buildFactoryMethod(params: ConstructorParamInfo[]) {
  const args = params
    .map((p) => `await container.resolve(${p.injectedExpression})`)
    .join(", ");

  return [
    "",
    "  static async [Symbol.for(\"async-di:create\")](container: any): Promise<any> {",
    `    return new this(${args});`,
    "  }",
    "",
  ].join("\n");
}

function injectedExpressionFor(
  typeExpression: string,
  id: string,
  imports: Map<string, ImportInfo>,
  interfaces: Set<string>,
  implementationIndex: Index | null,
  root: string
): string {
  const base = typeExpression.split(".")[0];
  const importInfo = imports.get(base);
  const isInterface = interfaces.has(base) || Boolean(importInfo?.typeOnly || importInfo?.specifierTypeOnly);

  if (!isInterface) {
    if (importInfo?.source && (importInfo.typeOnly || importInfo.specifierTypeOnly)) {
      const resolved = path.resolve(path.dirname(id), importInfo.source);
      const relativePath = path
        .relative(path.dirname(id), withoutExt(resolved))
        .replace(/\\/g, "/");
      const importPath = relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
      return `(await import(${jsString(`${importPath}.js`)})).${base}`;
    }
    return typeExpression;
  }

  const interfaceName = typeExpression.split(".").pop()!;

  let interfaceToken: string;
  if (interfaces.has(base)) {
    interfaceToken = `${modulePathWithoutExtension(id)}#${interfaceName}`;
  } else if (importInfo?.source) {
    const resolved = path.resolve(path.dirname(id), importInfo.source);
    interfaceToken = `${modulePathWithoutExtension(resolved)}#${interfaceName}`;
  } else {
    throw new Error(`Async DI (${id}): cannot resolve module for type ${typeExpression}`);
  }

  if (!implementationIndex) {
    throw new Error(`Async DI (${id}): no implementation index for ${interfaceToken}`);
  }

  const implementations = implementationIndex.get(interfaceToken);
  if (!implementations || implementations.length === 0) {
    throw new Error(`Async DI (${id}): no implementation found for ${interfaceToken}`);
  }
  if (implementations.length > 1) {
    throw new Error(`Async DI (${id}): multiple implementations for ${interfaceToken}; bind the desired implementation explicitly or resolve a concrete class`);
  }

  const implementationToken = implementations[0];
  const hashIndex = implementationToken.lastIndexOf("#");
  const implementationModule = implementationToken.slice(0, hashIndex);
  const implementationClassName = implementationToken.slice(hashIndex + 1);

  if (implementationModule === modulePathWithoutExtension(id)) {
    return implementationClassName;
  }

  return `(await import(${jsString(relativeModuleSpecifier(id, implementationModule))})).${implementationClassName}`;
}

export function transformTypeScript(
  source: string,
  id: string,
  implementationIndex: Index | null = null,
  root: string = process.cwd()
): TransformResult | null {
  let ast: any;
  try {
    ast = parse(source, {
      sourceType: "module",
      plugins: ["typescript", "decorators-legacy"],
    });
  } catch {
    return null;
  }

  const { imports, interfaces, typeAliases } = collectImports(ast);
  const classes: any[] = [];

  traverse(ast, {
    ClassDeclaration(path: NodePath<any>) {
      classes.push(path.node);
    },
    ClassExpression(path: NodePath<any>) {
      classes.push(path.node);
    },
  });

  if (classes.length === 0) {
    // Still may transform resolve<T>() calls.
  }

  const edits: Array<{ start: number; end: number; text: string }> = [];

  const localClasses = new Set(classes.map((c: any) => c.id?.name).filter(Boolean));

  // Class factories.
  for (const cls of classes) {
    const params = getConstructorParams(cls);
    if (params === null) continue;

    let valid = true;
    const validParams: ConstructorParamInfo[] = [];

    for (const param of params) {
      const base = param.typeExpression.split(".")[0];
      const importInfo = imports.get(base);
      const isInterface = interfaces.has(base) || Boolean(importInfo?.typeOnly || importInfo?.specifierTypeOnly);

      if (!isInterface) {
        if (!isResolvableType(param.typeExpression, imports, interfaces, typeAliases)) {
          valid = false;
          break;
        }
      } else if (!implementationIndex) {
        valid = false;
        break;
      }

      try {
        param.injectedExpression = injectedExpressionFor(
          param.typeExpression,
          id,
          imports,
          interfaces,
          implementationIndex,
          root
        );
      } catch (error) {
        throw error;
      }

      validParams.push(param);
    }

    if (!valid) continue;

    const alreadyHasFactory = (cls.body?.body ?? []).some((m: any) => {
      return (
        m.type === "ClassMethod" &&
        m.static === true &&
        m.computed === true &&
        m.key?.type === "CallExpression" &&
        m.key?.callee?.type === "MemberExpression" &&
        m.key?.callee?.object?.type === "Identifier" &&
        m.key?.callee?.object?.name === "Symbol" &&
        m.key?.callee?.property?.name === "for"
      );
    });

    if (alreadyHasFactory) continue;

    const method = buildFactoryMethod(validParams);
    edits.push({
      start: cls.end - 1,
      end: cls.end - 1,
      text: method,
    });
  }

  // Generic resolve<T>() calls.
  traverse(ast, {
    CallExpression(nodePath: NodePath<any>) {
      const node = nodePath.node;
      const callee = node.callee;
      if (callee?.type !== "MemberExpression") return;
      if (callee.property?.type !== "Identifier" || callee.property.name !== "resolve") return;
      const typeParameters = node.typeArguments ?? node.typeParameters;
      if (!typeParameters?.params || typeParameters.params.length !== 1) return;

      const typeNode = typeParameters.params[0];
      if (typeNode.type !== "TSTypeReference") return;

      const typeName = typeNode.typeName;
      let typeExpression: string;
      if (typeName?.type === "Identifier") {
        typeExpression = typeName.name;
      } else if (typeName?.type === "TSQualifiedName") {
        const left = typeName.left?.name;
        const right = typeName.right?.name;
        if (!left || !right) return;
        typeExpression = `${left}.${right}`;
      } else {
        return;
      }

      const base = typeExpression.split(".")[0];
      const simpleName = typeExpression.split(".").pop()!;
      const importInfo = imports.get(base);
      const isInterface =
        interfaces.has(simpleName) ||
        (implementationIndex?.has(
          `${modulePathWithoutExtension(importInfo?.source ? path.resolve(path.dirname(id), importInfo.source) : id)}#${simpleName}`
        ) ?? false);

      const objectSource = `(${source.slice(callee.object.start, callee.object.end)})`;
      let targetIdentifier: string | undefined;

      const candidateImplementations = implementationIndex
        ? implementationIndex.get(
            importInfo?.source
              ? `${modulePathWithoutExtension(path.resolve(path.dirname(id), importInfo.source))}#${simpleName}`
              : `${withoutExt(id)}#${simpleName}`
          )
        : undefined;

      if (interfaces.has(simpleName) || (candidateImplementations && candidateImplementations.length > 0)) {
        if (!implementationIndex) {
          throw new Error(`Async DI (${id}): no implementation index for ${simpleName}`);
        }

        const interfaceToken = interfaces.has(simpleName)
          ? `${modulePathWithoutExtension(id)}#${simpleName}`
          : importInfo?.source
          ? `${modulePathWithoutExtension(path.resolve(path.dirname(id), importInfo.source))}#${simpleName}`
          : `${modulePathWithoutExtension(id)}#${simpleName}`;

        const implementations = implementationIndex.get(interfaceToken);
        if (!implementations || implementations.length === 0) {
          // Treat as a class/type reference, not an interface.
        } else {
          if (implementations.length > 1) {
            throw new Error(`Async DI (${id}): multiple implementations for ${interfaceToken}; bind the desired implementation explicitly or resolve a concrete class`);
          }

          const implementationToken = implementations[0];
          const hashIndex = implementationToken.lastIndexOf("#");
          const implementationModule = implementationToken.slice(0, hashIndex);
          const implementationClassName = implementationToken.slice(hashIndex + 1);

          if (implementationModule === modulePathWithoutExtension(id)) {
            targetIdentifier = implementationClassName;
          } else {
            targetIdentifier = `(await import(${jsString(relativeModuleSpecifier(id, implementationModule))})).${implementationClassName}`;
          }

        }
      }

      if (!targetIdentifier) {

        if (!interfaces.has(simpleName) && !imports.has(base) && !localClasses.has(base)) {
          throw new Error(`Async DI (${id}): cannot resolve type ${typeExpression}`);
        }

        if (importInfo?.source && (importInfo.typeOnly || importInfo.specifierTypeOnly)) {
          const resolved = path.resolve(path.dirname(id), importInfo.source);
          targetIdentifier = `(await import(${jsString(relativeModuleSpecifier(id, modulePathWithoutExtension(resolved)))})).${simpleName}`;
        } else {
          targetIdentifier = base;
        }
      }

      edits.push({
        start: node.start,
        end: node.end,
        text: `${objectSource}.resolve(${targetIdentifier})`,
      });
    },
  });

  if (edits.length === 0) return null;

  const magic = new MagicString(source);
  for (const edit of edits) {
    if (edit.start === edit.end) {
      magic.appendLeft(edit.start, edit.text);
    } else {
      magic.overwrite(edit.start, edit.end, edit.text);
    }
  }

  const map = magic.generateMap({
    source: id,
    hires: true,
    includeContent: true,
  });

  return { code: magic.toString(), map, changed: true };
}

export function relativeImportPath(fromFile: string, toFile: string) {
  const rel = path.relative(path.dirname(fromFile), toFile);
  const withoutExt = rel.replace(/\.[^.]+$/, "");
  return withoutExt.startsWith(".") ? withoutExt : `./${withoutExt}`;
}
