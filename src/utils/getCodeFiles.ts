import { SourceFile, Project } from "ts-morph";

export const getCodeFiles = (codebasePath: string): SourceFile[] => {
  console.log(`Codebase path: ${codebasePath}`);

  const project = new Project({
    tsConfigFilePath: `${codebasePath}/tsconfig.json`,
  });

  return project.getSourceFiles();
};
