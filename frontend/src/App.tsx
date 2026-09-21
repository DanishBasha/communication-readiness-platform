import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/common/Navbar';
import { LandingPage } from './components/landing/LandingPage';
import { AuthModal } from './components/auth/AuthModal';
import { StudentDashboard } from './components/student/StudentDashboard';
import { MockInterviewRoom } from './components/student/MockInterviewRoom';
import { ListeningRoom } from './components/student/ListeningRoom';
import { DiagnosticReportView } from './components/student/DiagnosticReportView';
import { SuperAdminPortal } from './components/portals/SuperAdminPortal';
import { PlacementCoordinatorPortal } from './components/portals/PlacementCoordinatorPortal';
import { ProgramAdminPortal } from './components/portals/ProgramAdminPortal';
import { FacultyMentorPortal } from './components/portals/FacultyMentorPortal';
import { TrainerPortal } from './components/portals/TrainerPortal';

const MainContent: React.FC = () => {
  const { isAuthenticated, activeRole, activeView } = useApp();

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  if (activeRole === 'STUDENT') {
    switch (activeView) {
      case 'INTERVIEW_ROOM':
        return <MockInterviewRoom />;
      case 'LISTENING_ROOM':
        return <ListeningRoom />;
      case 'REPORT_VIEW':
        return <DiagnosticReportView />;
      case 'DASHBOARD':
      default:
        return <StudentDashboard />;
    }
  }

  switch (activeRole) {
    case 'SUPER_ADMIN':
      return <SuperAdminPortal />;
    case 'PROGRAM_ADMIN':
      return <ProgramAdminPortal />;
    case 'FACULTY_MENTOR':
      return <FacultyMentorPortal />;
    case 'TRAINER':
      return <TrainerPortal />;
    case 'PLACEMENT_COORDINATOR':
      return <PlacementCoordinatorPortal />;
    default:
      return <StudentDashboard />;
  }
};

const AppLayout: React.FC = () => {
  const { isAuthenticated } = useApp();

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900 flex flex-col antialiased selection:bg-neutral-900 selection:text-white">
      {isAuthenticated && <Navbar />}
      <main className="flex-1">
        <MainContent />
      </main>
      <AuthModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
};

export default App;

