# Employee Management System (EMS)

A modern web application built with React and Vite for managing employee tasks and workflows. This system allows administrators to create and assign tasks to employees, while employees can track, accept, complete, and manage their assigned tasks.

## Features

### Admin Dashboard

- Secure admin login
- Create and assign tasks to employees
- View all employee tasks and statuses
- Task management with categories and deadlines

### Employee Dashboard

- Employee login authentication
- View assigned tasks (New, Active, Completed, Failed)
- Accept new tasks
- Mark tasks as completed or failed
- Task tracking with descriptions and due dates

### Task Management

- Task categories (Web Development, Bug Fixing, Documentation, etc.)
- Task status tracking (New, Active, Completed, Failed)
- Due date management
- Task descriptions and titles

## Technologies Used

- **Frontend**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Data Storage**: Local Storage
- **Linting**: ESLint

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd Employee-Management-System
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

### Admin Login

- Email: `admin@gmail.com`
- Password: `123`

### Employee Login

Use one of the following credentials:

- Email: `employee1@gmail.com`, Password: `123`
- Email: `employee2@gmail.com`, Password: `123`
- Email: `employee3@gmail.com`, Password: `123`

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/
│   ├── Auth/
│   │   └── Login.jsx
│   ├── Dashboard/
│   │   ├── AdminDashboard.jsx
│   │   └── EmployeeDashboard.jsx
│   ├── others/
│   │   ├── AllTask.jsx
│   │   ├── CreateTask.jsx
│   │   ├── Header.jsx
│   │   └── TaskListNumbers.jsx
│   └── TaskList/
│       ├── AcceptTask.jsx
│       ├── CompleteTask.jsx
│       ├── FailedTask.jsx
│       ├── NewTask.jsx
│       └── TaskList.jsx
├── context/
│   └── AuthProvider.jsx
├── utils/
│   └── localStorage.jsx
├── App.jsx
└── main.jsx
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request
