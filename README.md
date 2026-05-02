# Beacon Dashboard

Emergency Response Team (ERT) Web Dashboard

A comprehensive web-based emergency management system for emergency response teams, administrators, and dispatchers. This dashboard provides real-time incident tracking, unit dispatch coordination, evacuation planning, and performance analytics.

## Features

- **Incident Management**: Real-time incident tracking and detailed incident information
- **Dispatch System**: Emergency unit coordination and deployment
- **Evacuation Planning**: Interactive evacuation route planning and safe zone management
- **Analytics Dashboard**: Performance metrics, response times, and operational insights
- **Real-time Mapping**: Visual incident locations and emergency unit tracking

## Emergency Response Capabilities

- Fire incidents
- Flood emergencies
- Gas leak detection
- Medical emergencies
- Traffic accidents
- Multi-severity incident classification (Critical, High, Medium)

## Technology Stack

- React with TypeScript
- Tailwind CSS for styling
- Recharts for data visualization
- Lucide React for icons
- Radix UI components
- Vite for build tooling

## Setup Instructions

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Response-To-City-Disaster/beacon-dashboard.git
   cd beacon-dashboard
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173` to view the dashboard

### Available Scripts

- **`npm run dev`** - Start the development server with hot reload
- **`npm run build`** - Build the project for production
- **`npm run preview`** - Preview the production build locally
- **`npm run lint`** - Run ESLint to check code quality

### Project Structure

```
beacon-dashboard/
├── src/
│   ├── components/
│   │   ├── ui/          # Reusable UI components
│   │   ├── web/         # Web dashboard components
│   │   └── figma/       # Figma design components
│   ├── globals.css      # Global styles and Tailwind CSS
│   └── App.tsx          # Main application component
├── public/              # Static assets
├── package.json         # Dependencies and scripts
├── tailwind.config.js   # Tailwind CSS configuration
├── vite.config.ts       # Vite build configuration
└── tsconfig.json        # TypeScript configuration
```

### Development

1. **Start development server**

   ```bash
   npm run dev
   ```

2. **Build for production**

   ```bash
   npm run build
   ```

3. **Preview production build**
   ```bash
   npm run preview
   ```

### Troubleshooting

If you encounter any issues:

1. **Clear node_modules and reinstall**

   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check Node.js version**

   ```bash
   node --version
   ```

   Ensure you're using Node.js 18 or higher.

3. **Restart development server**
   ```bash
   npm run dev
   ```
