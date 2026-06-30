import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { Task, Event, TeamMember, ChatMessage, Resource, Notification } from './src/types.js';

const DATA_FILE = path.join(process.cwd(), 'data.json');

// Default initial state
const defaultState = {
  checkInStatus: {
    checkedIn: false,
    checkInTime: null as string | null,
  },
  event: {
    id: "sharma-wedding",
    name: "Sharma Wedding",
    client: "Mehta Family",
    type: "Wedding",
    date: "Today",
    startTime: "08:00 AM",
    venue: "Racecourse Club, Rajkot",
    status: "live" as const,
    progress: 62,
    checkedInCount: 8,
    totalStaff: 9,
  },
  tasks: [
    {
      id: "t1",
      eventId: "sharma-wedding",
      name: "Venue Setup & Baraat Prep",
      startTime: "08:00 AM",
      deadline: "09:30 AM",
      status: "done" as const,
      department: "Decoration",
      assignees: ["RK", "SM"],
      subtasks: [],
      delayReport: null,
    },
    {
      id: "t2",
      eventId: "sharma-wedding",
      name: "Sound System Check",
      startTime: "09:30 AM",
      deadline: "11:00 AM",
      status: "done" as const,
      department: "Production",
      assignees: ["RK", "NP"],
      subtasks: [],
      delayReport: null,
    },
    {
      id: "t3",
      eventId: "sharma-wedding",
      name: "Pheras Ceremony — Live Coverage",
      startTime: "11:00 AM",
      deadline: "01:30 PM",
      status: "ongoing" as const,
      department: "Production",
      assignees: ["RK", "NP", "MR"],
      subtasks: [
        { id: "s1", name: "Set up camera angles", checked: true, assignedTo: "Rahul" },
        { id: "s2", name: "Mic placement for pandit", checked: true, assignedTo: "Sneha" },
        { id: "s3", name: "Live streaming setup", checked: false, assignedTo: "Rahul" }
      ],
      delayReport: null,
    },
    {
      id: "t4",
      eventId: "sharma-wedding",
      name: "Reception Hall Setup",
      startTime: "02:00 PM",
      deadline: "05:00 PM",
      status: "pending" as const,
      department: "Decoration",
      assignees: ["SM", "KD"],
      subtasks: [],
      delayReport: null,
    },
    {
      id: "t5",
      eventId: "sharma-wedding",
      name: "Evening Reception & DJ",
      startTime: "07:00 PM",
      deadline: "11:00 PM",
      status: "pending" as const,
      department: "Sound",
      assignees: ["DJ"],
      subtasks: [],
      delayReport: null,
    },
  ] as Task[],
  chat: [
    {
      id: "m1",
      sender: "Team Leader",
      avatar: "TL",
      role: "Leader",
      text: "Baraat delayed 30 mins. Adjust all timelines. See announcement.",
      time: "10:05 AM",
      senderId: "tl",
    },
    {
      id: "m2",
      sender: "Sneha Mehta",
      avatar: "SM",
      role: "Decoration",
      text: "Got it. Floral arch can wait, I'll finish the mandap first.",
      time: "10:07 AM",
      senderId: "sm",
    },
    {
      id: "m3",
      sender: "Rahul Kapoor",
      avatar: "RK",
      role: "Production",
      text: "Sound setup done. Ready whenever you need me.",
      time: "10:14 AM",
      senderId: "rk",
    },
  ] as ChatMessage[],
  resources: [
    {
      id: "r1",
      name: "Sharma_GuestList_Final.pdf",
      type: "pdf" as const,
      size: "2.4 MB",
      uploadedBy: "TL",
      uploadedAt: "3h ago",
      url: "#",
    },
    {
      id: "r2",
      name: "Lunch_Dinner_Menu.pdf",
      type: "doc" as const,
      size: "1.1 MB",
      uploadedBy: "TL",
      uploadedAt: "Yesterday",
      url: "#",
    },
    {
      id: "r3",
      name: "Stage_Setup_Done.jpg",
      type: "img" as const,
      size: "4.2 MB",
      uploadedBy: "RK",
      uploadedAt: "10:22 AM",
      url: "#",
    },
  ] as Resource[],
  notifications: [
    {
      id: "n1",
      type: "blue" as const,
      text: "Your task Pheras Ceremony has started automatically",
      time: "11:00 AM · Today",
    },
    {
      id: "n2",
      type: "accent" as const,
      text: "New announcement from Team Leader — Baraat delayed 30 mins",
      time: "10:05 AM · Today",
    },
    {
      id: "n3",
      type: "purple" as const,
      text: "Reception Hall Setup assigned to you — due 5:00 PM",
      time: "Yesterday 9:30 PM",
    },
    {
      id: "n4",
      type: "amber" as const,
      text: "Reminder: Venue Setup starts in 30 minutes",
      time: "Yesterday 7:30 AM",
    },
    {
      id: "n5",
      type: "green" as const,
      text: "You've been added to Sharma Wedding — check in your tasks",
      time: "Mon, 28 Apr",
    },
  ] as Notification[],
};

// Load state from file or use default
function loadState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error("Error loading data.json, resetting to defaults", e);
  }
  saveState(defaultState);
  return defaultState;
}

function saveState(state: typeof defaultState) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.error("Error writing data.json", e);
  }
}

// Start Server helper
async function startServer() {
  const app = express();
  app.use(express.json());

  // API Endpoints
  app.get('/api/state', (req, res) => {
    const state = loadState();
    res.json(state);
  });

  app.post('/api/checkin', (req, res) => {
    const state = loadState();
    const { checkedIn, time } = req.body;
    
    state.checkInStatus.checkedIn = checkedIn;
    state.checkInStatus.checkInTime = time;
    
    // Update event checked-in count
    if (checkedIn) {
      state.event.checkedInCount = 9; // Sharma Wedding checked in fully
    } else {
      state.event.checkedInCount = 8;
    }

    saveState(state);
    res.json({ success: true, state });
  });

  app.post('/api/chat', (req, res) => {
    res.status(403).json({ success: false, error: "Chat feature has been decommissioned. Please use the Event Crew Directory instead." });
  });

  app.post('/api/subtask/toggle', (req, res) => {
    const state = loadState();
    const { taskId, subtaskId, checked } = req.body;

    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
      const subtask = task.subtasks.find(s => s.id === subtaskId);
      if (subtask) {
        subtask.checked = checked;
        
        // Recalculate progress of tasks assigned to RK
        // For RK, we have 3 assigned tasks: t1 (done), t2 (done), t3 (ongoing)
        // Let's count completion percentage
        let doneCount = 0;
        let totalCount = 0;
        state.tasks.forEach(t => {
          if (t.assignees.includes("RK")) {
            totalCount++;
            if (t.status === "done") {
              doneCount++;
            } else if (t.status === "ongoing" && t.subtasks.length > 0) {
              // Add partial progress based on subtasks
              const checkedSub = t.subtasks.filter(s => s.checked).length;
              doneCount += checkedSub / t.subtasks.length;
            }
          }
        });
        
        if (totalCount > 0) {
          state.event.progress = Math.round((doneCount / totalCount) * 100);
        }
        
        saveState(state);
      }
    }

    res.json({ success: true, state });
  });

  app.post('/api/subtask/add', (req, res) => {
    const state = loadState();
    const { taskId, name, assignedTo } = req.body;

    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
      const newSubtask = {
        id: 'sub-' + Date.now(),
        name,
        checked: false,
        assignedTo: assignedTo || "Rahul",
      };
      task.subtasks.push(newSubtask);
      saveState(state);
    }

    res.json({ success: true, state });
  });

  app.post('/api/task/status', (req, res) => {
    const state = loadState();
    const { taskId, status } = req.body;

    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = status;
      if (status === "done") {
        task.subtasks.forEach(s => s.checked = true);
        task.delayReport = null;
      }
      
      // Add notification for status changes
      const statusLabels: Record<string, string> = {
        done: 'Completed',
        ongoing: 'Ongoing',
        delayed: 'Delayed',
        blocked: 'Blocked',
        pending: 'Pending'
      };

      const newNotif = {
        id: 'n-' + Date.now(),
        type: (status === 'done' ? 'green' : status === 'delayed' ? 'amber' : status === 'blocked' ? 'accent' : 'blue') as any,
        text: `Task "${task.name}" is now marked as ${statusLabels[status] || status}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · Today'
      };
      state.notifications.unshift(newNotif);

      // Recalculate progress
      let doneCount = 0;
      let totalCount = 0;
      state.tasks.forEach(t => {
        if (t.assignees.includes("RK")) {
          totalCount++;
          if (t.status === "done") {
            doneCount++;
          } else if (t.status === "ongoing" && t.subtasks.length > 0) {
            const checkedSub = t.subtasks.filter(s => s.checked).length;
            doneCount += checkedSub / t.subtasks.length;
          }
        }
      });
      if (totalCount > 0) {
        state.event.progress = Math.round((doneCount / totalCount) * 100);
      }

      saveState(state);
    }

    res.json({ success: true, state });
  });

  app.post('/api/task/delay', (req, res) => {
    const state = loadState();
    const { taskId, summary, time } = req.body;

    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = "delayed";
      task.delayReport = {
        summary,
        reportedAt: time,
        reportedBy: "Rahul Kapoor",
      };

      const newNotif = {
        id: 'n-' + Date.now(),
        type: 'amber' as const,
        text: `Delay reported for "${task.name}": "${summary}"`,
        time: time + ' · Today'
      };
      state.notifications.unshift(newNotif);

      saveState(state);
    }

    res.json({ success: true, state });
  });

  app.post('/api/resource/upload', (req, res) => {
    res.status(403).json({ success: false, error: "Access Denied. Only managers can upload documents to the Event Resource Vault." });
  });

  // Handle static asset serving or Vite development middleware
  const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod';
  const distPath = path.resolve(process.cwd(), 'dist');

  if (isProduction) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Always run on port 3000 as required by the infrastructure
  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`[Fullstack Backend] EventOS server running on http://0.0.0.0:${port} (mode: ${isProduction ? 'production' : 'development'})`);
  });
}

// Always start the server
startServer().catch(err => {
  console.error("Failed to start server:", err);
});
