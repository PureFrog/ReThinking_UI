// Every friend line goes through here (ux-spec 13.7-9). Today it reads the registry;
// a backend LLM call replaces these functions later without touching the scene or the UI.
import {friendById,type FriendLines} from './friends';
import {personaOf} from './personas';
import {TASKS,type TaskId} from './visitor-tasks';
export function friendLine(friendId:string,kind:keyof FriendLines){return friendById(friendId).lines[kind]}
export function taskLine(friendId:string,task:TaskId){const f=friendById(friendId);return f.taskLines?.[task]??personaOf(f.persona).lines?.[task]??TASKS[task].line}
