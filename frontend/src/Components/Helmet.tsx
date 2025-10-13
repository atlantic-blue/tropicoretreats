import { IconLogoSimple, NavItem } from '@maistro/ui';
import { HomeIcon } from '@radix-ui/react-icons';
import React from 'react';
import { useContext, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { AuthContext } from '@maistro/auth';
import Layout from './Layout';
import { appRoutes } from '../Routes/appRoutes';

interface HelmetProps {
  children: React.ReactNode;
}

const routesNavigation: NavItem[] = [
  {
    name: 'Dashboard',
    path: appRoutes.getHomeRoute(),
    icon: <HomeIcon />,
  },
  // {
  //   name: 'Explore',
  //   path: appRoutes.getExplore(),
  //   icon: <SearchIcon />,
  // },
  // {
  //   name: 'My Learning',
  //   path: appRoutes.getMyLearning(),
  //   icon: <BookmarkIcon />,
  // },
  // {
  //   name: 'Settings',
  //   path: appRoutes.getSettings(),
  //   icon: <GearIcon />,
  // },
];

function getPageTitle(path: string): string {
  switch (path) {
    case appRoutes.getHomeRoute():
      return 'Dashboard';
    case appRoutes.getExplore():
      return 'Explore';
    case appRoutes.getMyLearning():
      return 'My Learning';
    case appRoutes.getSettings():
      return 'Settings';
    default:
      return 'Dashboard';
  }
}

const Helmet: React.FC<HelmetProps> = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [pageTitle, setPageTitle] = useState(getPageTitle(location.pathname));
  const { logOut, user } = useContext(AuthContext);

  const handleNavigate = (path: string) => {
    navigate(path);
    setPageTitle(getPageTitle(path));
  };

  const handleOnSettings = () => {
    navigate(appRoutes.getUserSettings());
  };

  return (
    <Layout
      productName="Academy"
      accentColor="amber"
      navigation={routesNavigation}
      logo={<IconLogoSimple />}
      currentPath={location.pathname}
      user={{
        name: user?.getName() || '',
        email: user?.getEmail() || '',
        avatar: user?.getAvatar() || '',
      }}
      onLogout={logOut}
      onNavigate={handleNavigate}
      headerTitle={pageTitle}
      notificationCount={3}
      helpUrl="https://wa.me/573013239010"
      onSettings={handleOnSettings}
    >
      {props.children}
    </Layout>
  );
};

export default Helmet;
