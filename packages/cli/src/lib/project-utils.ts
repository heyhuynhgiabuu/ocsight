import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { getDefaultOpenCodePath } from "./data.js";

export interface ProjectInfo {
  id: string;
  worktree: string;
  vcs?: string;
  name?: string;
  time?: {
    created: number;
  };
}

export async function detectProjectInfo(): Promise<ProjectInfo | null> {
  try {
    const dataPath = getDefaultOpenCodePath();
    const projectPath = join(dataPath, "storage", "project");
    
    const files = await readdir(projectPath);
    const jsonFiles = files.filter(f => f.endsWith(".json"));
    
    if (jsonFiles.length === 0) return null;
    
    let mostRecentProject: ProjectInfo | null = null;
    let mostRecentTime = 0;
    
    for (const file of jsonFiles) {
      try {
        const filePath = join(projectPath, file);
        const stats = await stat(filePath);
        
        if (stats.mtimeMs > mostRecentTime) {
          const content = await readFile(filePath, "utf8");
          const projectData = JSON.parse(content);
          
          mostRecentTime = stats.mtimeMs;
          mostRecentProject = {
            ...projectData,
            name: projectData.worktree ? projectData.worktree.split('/').pop() : 'Unknown'
          };
        }
      } catch (error) {
        continue;
      }
    }
    
    return mostRecentProject;
  } catch (error) {
    return null;
  }
}

export async function getProjectById(projectId: string): Promise<ProjectInfo | null> {
  try {
    const dataPath = getDefaultOpenCodePath();
    const projectFile = join(dataPath, "storage", "project", `${projectId}.json`);
    
    const content = await readFile(projectFile, "utf8");
    const projectData = JSON.parse(content);
    
    return {
      ...projectData,
      name: projectData.worktree ? projectData.worktree.split('/').pop() : 'Unknown'
    };
  } catch (error) {
    return null;
  }
}