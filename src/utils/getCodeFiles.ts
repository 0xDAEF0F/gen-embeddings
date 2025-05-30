import { Project, type SourceFile } from "ts-morph";

export const getCodeFiles = (codebasePath: string): SourceFile[] => {
  const project = new Project({
    tsConfigFilePath: `${codebasePath}/tsconfig.json`,
  });
  const files = project.getSourceFiles();

  // How to get the JSDoc in a file
  // const a = files[0].getFunctions()[0].getJsDocs();

  // TODO: make this configurable in a parameter for the function
  return files.filter((file) => {
    const fileName = file.getFilePath();
    if (fileName.includes(".test.ts")) return false;
    if (fileName.includes("__generated__")) return false;
    return true;
  });
};
