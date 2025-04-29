import { type SourceFile, ts } from "ts-morph";
import { v4 as uuidv4 } from "uuid";
import { getCodeFiles } from "./getCodeFiles";
import type { CodeChunk } from "./vectorstore";

const chunkCode = (codebasePath: string): CodeChunk[] => {
  const files = getCodeFiles(codebasePath);
  const chunks: CodeChunk[] = [];

  for (const sourceFile of files) {
    chunks.push(...processSourceFile(sourceFile));
  }

  return chunks;
};

export const processSourceFile = (sourceFile: SourceFile): CodeChunk[] => {
  const chunks: (CodeChunk | undefined)[] = [];
  const filePath = sourceFile.getFilePath();

  console.log(`\nProcessing source file: ${sourceFile.getBaseName()}`);

  console.log(`  Functions found: ${sourceFile.getFunctions().length}`);
  for (const func of sourceFile.getFunctions()) {
    const funcNode = func.compilerNode;
    chunks.push(
      createChunkFromNode(sourceFile, funcNode, "function", filePath),
    );
  }

  console.log(`  Classes found: ${sourceFile.getClasses().length}`);
  for (const classDecl of sourceFile.getClasses()) {
    const classDeclNode = classDecl.compilerNode;
    chunks.push(
      createChunkFromNode(sourceFile, classDeclNode, "class", filePath),
    );
  }

  console.log(`  Interfaces found: ${sourceFile.getInterfaces().length}`);
  for (const interfaceDecl of sourceFile.getInterfaces()) {
    const interfaceDeclNode = interfaceDecl.compilerNode;
    chunks.push(
      createChunkFromNode(sourceFile, interfaceDeclNode, "interface", filePath),
    );
  }

  console.log(`  Enums found: ${sourceFile.getEnums().length}`);
  for (const enumDecl of sourceFile.getEnums()) {
    const enumDeclNode = enumDecl.compilerNode;
    chunks.push(
      createChunkFromNode(sourceFile, enumDeclNode, "enum", filePath),
    );
  }

  console.log(`  Type aliases found: ${sourceFile.getTypeAliases().length}`);
  for (const typeAlias of sourceFile.getTypeAliases()) {
    const typeAliasNode = typeAlias.compilerNode;
    chunks.push(
      createChunkFromNode(sourceFile, typeAliasNode, "type", filePath),
    );
  }

  const remainingCode = getRemainingCode(sourceFile);
  console.log(`  Remaining code: ${remainingCode.length} characters`);
  if (remainingCode.trim() !== "") {
    chunks.push(...processRemainingCode(sourceFile, remainingCode, filePath));
  }

  return chunks.filter(Boolean) as CodeChunk[];
};

const getRemainingCode = (sourceFile: SourceFile): string => {
  let code = sourceFile.getFullText();

  const nodesToRemove = [
    ...sourceFile.getFunctions(),
    ...sourceFile.getClasses(),
    ...sourceFile.getInterfaces(),
    ...sourceFile.getEnums(),
    ...sourceFile.getTypeAliases(),
  ];

  nodesToRemove.sort((a, b) => b.getPos() - a.getPos()); // Sort in reverse order

  for (const node of nodesToRemove) {
    const start = node.getStart();
    const end = node.getEnd();
    code = code.substring(0, start) + code.substring(end);
  }

  return code;
};

const processRemainingCode = (
  sourceFile: SourceFile,
  remainingCode: string,
  filePath: string,
): CodeChunk[] => {
  const chunks: CodeChunk[] = [];
  const ast = ts.createSourceFile(
    filePath,
    remainingCode,
    ts.ScriptTarget.Latest,
    true,
  );

  console.log(`\nProcessing remaining code in: ${sourceFile.getBaseName()}`);

  // pushes a chunk to the array
  const createChunk = (node: ts.Node, type: CodeChunk["metadata"]["type"]) => {
    const start = node.getStart(ast);
    const end = node.getEnd();
    const content = node.getText(ast);

    const jsDocRelatedToNode = ts.getJSDocCommentsAndTags(node);
    const jsDocComment =
      jsDocRelatedToNode.length > 0
        ? jsDocRelatedToNode[0].getText()
        : undefined;

    if (jsDocComment?.includes("@internal")) {
      return;
    }

    chunks.push({
      id: uuidv4(),
      content: jsDocComment ? `${jsDocComment}\n${content}` : content,
      metadata: {
        type,
      },
      path: filePath,
      startLine: ast.getLineAndCharacterOfPosition(start).line + 1,
      endLine: ast.getLineAndCharacterOfPosition(end).line + 1,
    });
  };

  const traverse = (node: ts.Node) => {
    if (
      ts.isVariableStatement(node) ||
      ts.isExpressionStatement(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node)
    ) {
      createChunk(node, getNodeType(node));
    } else {
      ts.forEachChild(node, traverse);
    }
  };

  traverse(ast);

  return chunks;
};

const createChunkFromNode = (
  sourceFile: SourceFile,
  node: ts.Node,
  nodeType: "function" | "class" | "interface" | "type" | "enum" | "other",
  filePath: string,
  ast?: ts.SourceFile,
): CodeChunk | undefined => {
  const nodeSourceFile = ast ?? node.getSourceFile();

  const start = node.getStart(nodeSourceFile);
  const startLine = sourceFile.getLineAndColumnAtPos(start).line;
  const end = node.getEnd();
  const endLine = sourceFile.getLineAndColumnAtPos(end).line;

  const content = node.getText(nodeSourceFile);

  // Get JSDoc if available
  let jsDocComment: string | undefined;
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isClassDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isEnumDeclaration(node) ||
    ts.isTypeAliasDeclaration(node)
  ) {
    const jsDocNodes = ts.getJSDocCommentsAndTags(node);
    jsDocComment = jsDocNodes.length > 0 ? jsDocNodes[0].getText() : undefined;
  }

  if (jsDocComment?.includes("@internal")) {
    return;
  }

  const chunk: CodeChunk = {
    id: uuidv4(),
    content: jsDocComment ? `${jsDocComment}\n${content}` : content,
    metadata: {
      type: nodeType,
    },
    path: filePath,
    startLine,
    endLine,
  };

  let name: string | undefined;

  if (ts.isFunctionDeclaration(node) && node.name) {
    name = node.name.getText(nodeSourceFile);
    chunk.metadata.type = "function";
  } else if (ts.isClassDeclaration(node) && node.name) {
    name = node.name.getText(nodeSourceFile);
    chunk.metadata.type = "class";
  } else if (ts.isInterfaceDeclaration(node) && node.name) {
    name = node.name.getText(nodeSourceFile);
    chunk.metadata.type = "interface";
  } else if (ts.isEnumDeclaration(node) && node.name) {
    name = node.name.getText(nodeSourceFile);
    chunk.metadata.type = "enum";
  } else if (ts.isTypeAliasDeclaration(node) && node.name) {
    name = node.name.getText(nodeSourceFile);
    chunk.metadata.type = "type";
  }

  if (name) {
    chunk.metadata.functionOrClassName = name;
  }

  return chunk;
};

const getNodeType = (
  node: ts.Node,
):
  | "function"
  | "class"
  | "interface"
  | "type"
  | "enum"
  | "variable"
  | "expression"
  | "import"
  | "export"
  | "other" => {
  if (ts.isFunctionDeclaration(node)) {
    return "function";
  }
  if (ts.isClassDeclaration(node)) {
    return "class";
  }
  if (ts.isInterfaceDeclaration(node)) {
    return "interface";
  }
  if (ts.isTypeAliasDeclaration(node)) {
    return "type";
  }
  if (ts.isEnumDeclaration(node)) {
    return "enum";
  }
  if (ts.isVariableStatement(node)) {
    return "variable";
  }
  if (ts.isExpressionStatement(node)) {
    return "expression";
  }
  if (ts.isImportDeclaration(node)) {
    return "import";
  }
  if (ts.isExportDeclaration(node)) {
    return "export";
  }
  return "other";
};

export const getChunkedCode = (codebasePath: string) => chunkCode(codebasePath);
