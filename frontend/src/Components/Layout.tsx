/* eslint-disable */
import React, { useState } from 'react';
import {
  Box,
  Flex,
  Container,
  Text,
  Avatar,
  DropdownMenu,
  Button,
  ScrollArea,
  Tooltip,
  Theme,
} from '@radix-ui/themes';
import {
  HamburgerMenuIcon,
  Cross1Icon,
  ChevronDownIcon,
  GearIcon,
  ExitIcon,
  BellIcon,
  QuestionMarkCircledIcon,
} from '@radix-ui/react-icons';

export interface NavItem {
  name: string;
  path: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface LayoutProps {
  children: React.ReactNode;
  productName: string;
  accentColor: 'blue' | 'orange' | 'green' | 'purple' | 'indigo' | 'red' | 'cyan' | 'amber';
  navigation: NavItem[];
  logo: React.ReactNode;
  currentPath: string; // Active path from the current product router
  user?: {
    name: string;
    email?: string;
    avatar?: string;
  };
  onLogout?: () => void;
  onNavigate?: (path: string) => void; // Navigation callback
  headerTitle?: string;
  notificationCount?: number;
  helpUrl?: string;
  onSettings: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  productName,
  accentColor,
  navigation,
  logo,
  currentPath,
  user,
  onLogout,
  onNavigate,
  onSettings,
  headerTitle,
  notificationCount = 0,
  helpUrl,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) => {
    return currentPath === path;
  };

  const handleNavClick = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    }

    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  return (
    <Theme
      accentColor={accentColor}
      grayColor="auto"
      scaling="100%"
      radius="small"
      appearance="light"
    >
      <Flex className="h-screen overflow-hidden">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <Box
          className={`
              fixed inset-y-0 left-0 z-30 w-64 transform bg-white border-r border-gray-200 
              transition-transform duration-300 ease-in-out lg:static lg:translate-x-0
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
        >
          {/* Sidebar Header with Logo */}
          <Flex
            className="h-16 items-center justify-between px-4 border-b border-gray-200"
            align="center"
          >
            <Flex align="center" gap="2">
              <Box className="w-8 h-8">{logo}</Box>
              <Text weight="bold" size="3">
                Maistro {productName}
              </Text>
            </Flex>
            <Button variant="ghost" onClick={() => setSidebarOpen(false)} className="lg:hidden">
              <Cross1Icon />
            </Button>
          </Flex>

          {/* Navigation Items */}
          <ScrollArea className="h-[calc(100vh-4rem)]">
            <Box className="p-4">
              {navigation.map((item) => (
                <Flex
                  key={item.path}
                  className={`
                      mb-1 rounded-md px-3 py-2 cursor-pointer
                      ${
                        isActive(item.path)
                          ? `bg-${accentColor}-100 text-${accentColor}-900`
                          : 'text-gray-700 hover:bg-gray-100'
                      }
                      transition-colors
                    `}
                  align="center"
                  gap="2"
                  onClick={() => handleNavClick(item.path)}
                >
                  {item.icon && (
                    <Box
                      className={isActive(item.path) ? `text-${accentColor}-900` : 'text-gray-500'}
                    >
                      {item.icon}
                    </Box>
                  )}
                  <Text size="2" weight={isActive(item.path) ? 'medium' : 'regular'}>
                    {item.name}
                  </Text>

                  {/* Show badge if present */}
                  {item.badge && (
                    <Box
                      className={`
                        ml-auto px-2 py-0.5 rounded-full text-xs
                        ${
                          isActive(item.path)
                            ? `bg-${accentColor}-200 text-${accentColor}-900`
                            : 'bg-gray-200 text-gray-700'
                        }
                      `}
                    >
                      {item.badge}
                    </Box>
                  )}
                </Flex>
              ))}
            </Box>

            {/* Help section at the bottom */}
            {helpUrl && (
              <Box className="p-4 mt-auto border-t border-gray-200">
                <Flex
                  className="rounded-md px-3 py-2 cursor-pointer hover:bg-gray-100"
                  align="center"
                  gap="2"
                  onClick={() => window.open(helpUrl, '_blank')}
                >
                  <QuestionMarkCircledIcon className="text-gray-500" />
                  <Text size="2">Ayuda</Text>
                </Flex>
              </Box>
            )}
          </ScrollArea>
        </Box>

        {/* Main Content */}
        <Box className="flex flex-col flex-1 w-0 overflow-hidden">
          {/* Header */}
          <Box className="border-b border-gray-200 bg-white">
            <Flex className="h-16 px-4" justify="between" align="center">
              <Flex align="center" gap="4">
                {/* Mobile menu button */}
                <Button variant="ghost" onClick={() => setSidebarOpen(true)} className="lg:hidden">
                  <HamburgerMenuIcon />
                </Button>

                {/* Header title */}
                <Text weight="bold" size="3">
                  {headerTitle || 'Dashboard'}
                </Text>
              </Flex>

              <Flex align="center" gap="4">
                {/* Notifications */}
                <Tooltip content="Notifications">
                  <Button variant="ghost">
                    <Box className="relative">
                      <BellIcon />
                      {notificationCount > 0 && (
                        <Box
                          className={`
                            absolute -top-1 -right-1 w-4 h-4 rounded-full 
                            bg-${accentColor}-500 text-white text-[10px] 
                            flex items-center justify-center
                          `}
                        >
                          {notificationCount > 9 ? '9+' : notificationCount}
                        </Box>
                      )}
                    </Box>
                  </Button>
                </Tooltip>

                {/* User Menu */}
                {user && (
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                      <Flex align="center" gap="2" className="cursor-pointer">
                        <Avatar
                          src={user.avatar}
                          fallback={user.name.substring(0, 2).toUpperCase()}
                          radius="full"
                          size="2"
                        />
                        <Text size="2" weight="medium" className="hidden sm:block">
                          {user.name}
                        </Text>
                        <ChevronDownIcon />
                      </Flex>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                      <Box className="px-3 py-2 flex flex-col">
                        <Text size="2" weight="bold">
                          {user.name}
                        </Text>
                        {user.email && (
                          <Text size="1" color="gray">
                            {user.email}
                          </Text>
                        )}
                      </Box>
                      {/* <DropdownMenu.Separator />
                      <DropdownMenu.Item onClick={onSettings}>
                        <Flex align="center" gap="2">
                          <GearIcon />
                          <Text size="2">Settings</Text>
                        </Flex>
                      </DropdownMenu.Item> */}
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item onClick={onLogout}>
                        <Flex align="center" gap="2">
                          <ExitIcon />
                          <Text size="2">Logout</Text>
                        </Flex>
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                )}
              </Flex>
            </Flex>
          </Box>

          {/* Page Content */}
          <Box className="flex-1 overflow-auto bg-gray-50">
            <Container className="py-6">{children}</Container>
          </Box>
        </Box>
      </Flex>
    </Theme>
  );
};

export default Layout;
