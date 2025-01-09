import { SourceFile, ts } from "ts-morph";
import { v4 as uuidv4 } from "uuid";
import { getCodeFiles } from "./getCodeFiles";

interface CodeChunk {
  id: string;
  content: string;
  metadata: {
    type:
      | "function"
      | "class"
      | "interface"
      | "other"
      | "variable"
      | "expression"
      | "import"
      | "export"
      | "type"
      | "enum";
    functionOrClassName?: string;
  };
  path: string;
  startLine: number;
  endLine: number;
  embedding?: number[];
}

const chunkCode =(codebasePath: string): CodeChunk[] => {
  const files = getCodeFiles(codebasePath);
  const chunks: CodeChunk[] = [];

  files.forEach((sourceFile) => {
    chunks.push(...processSourceFile(sourceFile));
  });

  return chunks;
}

const processSourceFile = (sourceFile: SourceFile): CodeChunk[] => {
  const chunks: CodeChunk[] = [];
  const filePath = sourceFile.getFilePath();

  console.log(`\nProcessing source file: ${sourceFile.getBaseName()}`);

  console.log(`  Functions found: ${sourceFile.getFunctions().length}`);
  sourceFile.getFunctions().forEach((func) => {
    const funcNode = func.compilerNode;
    chunks.push(
      createChunkFromNode(sourceFile, funcNode, "function", filePath),
    );
  });

  console.log(`  Classes found: ${sourceFile.getClasses().length}`);
  sourceFile.getClasses().forEach((classDecl) => {
    const classDeclNode = classDecl.compilerNode;
    chunks.push(
      createChunkFromNode(sourceFile, classDeclNode, "class", filePath),
    );
  });

  console.log(`  Interfaces found: ${sourceFile.getInterfaces().length}`);
  sourceFile.getInterfaces().forEach((interfaceDecl) => {
    const interfaceDeclNode = interfaceDecl.compilerNode;
    chunks.push(
      createChunkFromNode(sourceFile, interfaceDeclNode, "interface", filePath),
    );
  });

  console.log(`  Enums found: ${sourceFile.getEnums().length}`);
  sourceFile.getEnums().forEach((enumDecl) => {
    const enumDeclNode = enumDecl.compilerNode;
    chunks.push(
      createChunkFromNode(sourceFile, enumDeclNode, "enum", filePath),
    );
  });

  console.log(`  Type aliases found: ${sourceFile.getTypeAliases().length}`);
  sourceFile.getTypeAliases().forEach((typeAlias) => {
    const typeAliasNode = typeAlias.compilerNode;
    chunks.push(
      createChunkFromNode(sourceFile, typeAliasNode, "type", filePath),
    );
  });

  const remainingCode = getRemainingCode(sourceFile);
  console.log(`  Remaining code: ${remainingCode.length} characters`);
  if (remainingCode.trim() !== "") {
    chunks.push(...processRemainingCode(sourceFile, remainingCode, filePath));
  }

  return chunks;
}

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

  nodesToRemove.forEach((node) => {
    const start = node.getStart();
    const end = node.getEnd();
    code = code.substring(0, start) + code.substring(end);
  });

  return code;
}

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

  const createChunk = (node: ts.Node, type: CodeChunk["metadata"]["type"]) => {
    const start = node.getStart(ast);
    const end = node.getEnd();
    const content = node.getText(ast);

    chunks.push({
      id: uuidv4(),
      content,
      metadata: { type },
      path: filePath,
      startLine: ast.getLineAndCharacterOfPosition(start).line + 1,
      endLine: ast.getLineAndCharacterOfPosition(end).line + 1,
    });
  };

  const traverse = (node: ts.Node) => {
    if (
      ts.isImportDeclaration(node) ||
      ts.isExportDeclaration(node) ||
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
}

const createChunkFromNode = (
  sourceFile: SourceFile,
  node: ts.Node,
  nodeType: "function" | "class" | "interface" | "type" | "enum" | "other",
  filePath: string,
  ast?: ts.SourceFile,
): CodeChunk => {
  const nodeSourceFile = ast ?? node.getSourceFile();

  const start = node.getStart(nodeSourceFile);
  const startLine = sourceFile.getLineAndColumnAtPos(start).line;
  const end = node.getEnd();
  const endLine = sourceFile.getLineAndColumnAtPos(end).line;

  const content = node.getText(nodeSourceFile);

  const chunk: CodeChunk = {
    id: uuidv4(),
    content,
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
}

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
  } else if (ts.isClassDeclaration(node)) {
    return "class";
  } else if (ts.isInterfaceDeclaration(node)) {
    return "interface";
  } else if (ts.isTypeAliasDeclaration(node)) {
    return "type";
  } else if (ts.isEnumDeclaration(node)) {
    return "enum";
  } else if (ts.isVariableStatement(node)) {
    return "variable";
  } else if (ts.isExpressionStatement(node)) {
    return "expression";
  } else if (ts.isImportDeclaration(node)) {
    return "import";
  } else if (ts.isExportDeclaration(node)) {
    return "export";
  } else {
    return "other";
  }
}

export const getChunkedCode = (codebasePath: string) => chunkCode(codebasePath);
