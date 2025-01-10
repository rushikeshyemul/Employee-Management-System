// localStorage.clear();

const employees = [
  {
    id: 1,
    firstName: "Aditi",
    email: "employee1@gmail.com",
    password: "123",
    taskNumbers: {
      active: 2,
      newTask: 2,
      completed: 1,
      failed: 0,
    },
    tasks: [
      {
        active: true,
        newTask: true,
        completed: false,
        failed: false,
        taskTitle: "Design homepage",
        taskDescription: "Create a responsive homepage for the website.",
        taskDate: "2024-11-28",
        category: "Web Development",
      },
      {
        active: false,
        newTask: false,
        completed: true,
        failed: false,
        taskTitle: "Fix login bug",
        taskDescription:
          "Resolve the authentication issue in the login module.",
        taskDate: "2024-11-25",
        category: "Bug Fixing",
      },
      {
        active: true,
        newTask: true,
        completed: false,
        failed: false,
        taskTitle: "Prepare documentation",
        taskDescription: "Document the process for API integration.",
        taskDate: "2024-11-30",
        category: "Documentation",
      },
    ],
  },
  {
    id: 2,
    firstName: "Isha",
    email: "employee2@gmail.com",
    password: "123",
    taskNumbers: {
      active: 1,
      newTask: 0,
      completed: 1,
      failed: 0,
    },
    tasks: [
      {
        active: true,
        newTask: false,
        completed: false,
        failed: false,
        taskTitle: "Optimize database",
        taskDescription:
          "Improve the database performance by optimizing queries.",
        taskDate: "2024-11-29",
        category: "Database Management",
      },
      {
        active: false,
        newTask: false,
        completed: true,
        failed: false,
        taskTitle: "Create API endpoints",
        taskDescription: "Develop new API endpoints for user data.",
        taskDate: "2024-11-26",
        category: "Backend Development",
      },
    ],
  },
  {
    id: 3,
    firstName: "Kavya",
    email: "employee3@gmail.com",
    password: "123",
    taskNumbers: {
      active: 1,
      newTask: 1,
      completed: 1,
      failed: 0,
    },
    tasks: [
      {
        active: false,
        newTask: false,
        completed: true,
        failed: false,
        taskTitle: "Test payment gateway",
        taskDescription:
          "Perform testing on the new payment gateway integration.",
        taskDate: "2024-11-27",
        category: "Quality Assurance",
      },
      {
        active: true,
        newTask: true,
        completed: false,
        failed: false,
        taskTitle: "Setup CI/CD",
        taskDescription: "Implement a CI/CD pipeline for the project.",
        taskDate: "2024-11-30",
        category: "DevOps",
      },
    ],
  },
  {
    id: 4,
    firstName: "Aarav",
    email: "employee4@gmail.com",
    password: "123",
    taskNumbers: {
      active: 2,
      newTask: 2,
      completed: 1,
      failed: 0,
    },
    tasks: [
      {
        active: false,
        newTask: false,
        completed: true,
        failed: false,
        taskTitle: "Write test cases",
        taskDescription:
          "Develop unit and integration test cases for the modules.",
        taskDate: "2024-11-25",
        category: "Testing",
      },
      {
        active: true,
        newTask: true,
        completed: false,
        failed: false,
        taskTitle: "Monitor server performance",
        taskDescription: "Ensure server uptime and check resource usage.",
        taskDate: "2024-11-28",
        category: "System Administration",
      },
      {
        active: true,
        newTask: true,
        completed: false,
        failed: false,
        taskTitle: "Analyze user feedback",
        taskDescription:
          "Review and analyze feedback from users for improvements.",
        taskDate: "2024-12-01",
        category: "Customer Feedback",
      },
    ],
  },
  {
    id: 5,
    firstName: "Ananya",
    email: "employee5@gmail.com",
    password: "123",
    taskNumbers: {
      active: 2,
      newTask: 2,
      completed: 1,
      failed: 0,
    },
    tasks: [
      {
        active: true,
        newTask: true,
        completed: false,
        failed: false,
        taskTitle: "Plan marketing strategy",
        taskDescription: "Design a marketing plan for the product launch.",
        taskDate: "2024-11-29",
        category: "Marketing",
      },
      {
        active: false,
        newTask: false,
        completed: true,
        failed: false,
        taskTitle: "Fix UI bugs",
        taskDescription: "Address the reported UI bugs in the dashboard.",
        taskDate: "2024-11-26",
        category: "UI Development",
      },
      {
        active: true,
        newTask: true,
        completed: false,
        failed: false,
        taskTitle: "Conduct code review",
        taskDescription: "Review code submissions from the development team.",
        taskDate: "2024-11-30",
        category: "Code Review",
      },
    ],
  },
];

const admin = [
  {
    id: 1,
    firstName: "Rushikesh",
    email: "admin@gmail.com",
    password: "123",
  },
];

export const setLocalStorage = () => {
  localStorage.setItem("employees", JSON.stringify(employees));
  localStorage.setItem("admin", JSON.stringify(admin));
};
// HERE WE HAVE SET THE DATA TO LOCAL STORAGE

export const getLocalStorage = () => {
  const employees = JSON.parse(localStorage.getItem("employees"));
  const admin = JSON.parse(localStorage.getItem("admin"));

  return { employees, admin };
};
// WE ARE GETTING THE DATA FROM LOCAL STORAGE
