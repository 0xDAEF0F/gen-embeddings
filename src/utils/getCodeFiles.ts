import { Project, type SourceFile } from "ts-morph";

export const getCodeFiles = (codebasePath: string): SourceFile[] => {
	const project = new Project({
		tsConfigFilePath: `${codebasePath}/tsconfig.json`,
	});
	return project.getSourceFiles();
};
