import { Project, type SourceFile } from "ts-morph";

export const getCodeFiles = (codebasePath: string): SourceFile[] => {
	console.log(`Codebase path: ${codebasePath}`);

	const project = new Project({
		tsConfigFilePath: `${codebasePath}/tsconfig.json`,
	});

	return project.getSourceFiles();
};

// const files = getCodeFiles(
//   "/Users/ale/Documents/external-libraries/thirdweb-js/packages/thirdweb"
// );

// console.log(`Found ${files.length} files`);

// for (const file of files) {
//   console.log(file.getBaseName());
// }

// console.log(files.length);
