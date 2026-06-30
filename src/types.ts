export interface SubTask {
  id: string;
  name: string;
  checked: boolean;
  assignedTo: string;
}

export interface DelayReport {
  summary: string;
  reportedAt: string;
  reportedBy: string;
}

export interface Task {
  id: string;
  eventId: string;
  name: string;
  startTime: string;
  deadline: string;
  status: 'pending' | 'ongoing' | 'delayed' | 'done' | 'blocked';
  department: string;
  assignees: string[]; // initials of team members
  subtasks: SubTask[];
  delayReport: DelayReport | null;
}

export interface Event {
  id: string;
  name: string;
  client: string;
  type: string;
  date: string;
  startTime: string;
  venue: string;
  status: 'live' | 'upcoming' | 'done';
  progress: number;
  checkedInCount: number;
  totalStaff: number;
}

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  status: 'Online' | 'Offline' | 'Delayed task';
  tasksDone: number;
  totalTasks: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  avatar: string;
  role: string;
  text: string;
  time: string;
  senderId: string; // to identify if it's 'me'
}

export interface Resource {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'img';
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  url: string;
}

export interface Notification {
  id: string;
  type: 'blue' | 'accent' | 'purple' | 'amber' | 'green';
  text: string;
  time: string;
}

export interface AppState {
  currentEventId: string;
  events: Event[];
  tasks: Task[];
  team: TeamMember[];
  chat: ChatMessage[];
  resources: Resource[];
  notifications: Notification[];
}
