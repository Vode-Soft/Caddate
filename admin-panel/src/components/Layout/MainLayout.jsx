import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  DirectionsCar as VehicleIcon,
  Photo as PhotoIcon,
  Message as MessageIcon,
  Security as SecurityIcon,
  CardMembership as SubscriptionIcon,
  Logout as LogoutIcon,
  Support as SupportIcon,
  AdminPanelSettings as AdminPanelIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

const drawerWidth = 280;

const menuItems = [
  { text: 'Dashboard', icon: DashboardIcon, path: '/dashboard' },
  { text: 'Kullanıcılar', icon: PeopleIcon, path: '/users' },
  { text: 'Abonelikler', icon: SubscriptionIcon, path: '/subscriptions' },
  { text: 'Araçlar', icon: VehicleIcon, path: '/vehicles' },
  { text: 'Fotoğraflar', icon: PhotoIcon, path: '/photos' },
  { text: 'Mesajlar', icon: MessageIcon, path: '/messages' },
  { text: 'Destek Talepleri', icon: SupportIcon, path: '/support' },
  { text: 'Güvenlik', icon: SecurityIcon, path: '/security' },
];

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const drawer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#1a1a1a',
      }}
    >
      {/* Branding Section */}
      <Box
        sx={{
          px: 3,
          py: 2.5,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
            }}
          >
            <AdminPanelIcon sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: '1.1rem',
                color: '#ffffff',
                lineHeight: 1.2,
              }}
            >
              CaddateApp
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.75rem',
                display: 'block',
              }}
            >
              Admin Panel
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* User Profile Section */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: '#dc2626',
              fontWeight: 600,
              fontSize: '1rem',
            }}
          >
            {user?.first_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'A'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                color: '#ffffff',
                fontWeight: 500,
                fontSize: '0.875rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.first_name && user?.last_name
                ? `${user.first_name} ${user.last_name}`
                : user?.email || 'Admin'}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.75rem',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.email || 'admin@caddate.com'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ mt: 1.5 }}>
          <Chip
            label={user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
            size="small"
            sx={{
              bgcolor: '#dc2626',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 22,
              '& .MuiChip-label': {
                px: 1,
              },
            }}
          />
        </Box>
      </Box>

      {/* Navigation Menu */}
      <Box 
        className="sidebar-scrollbar"
        sx={{ 
          flex: 1, 
          minHeight: 0,
          overflowY: 'auto', 
          overflowX: 'hidden', 
          py: 1 
        }}
      >
        <List sx={{ px: 1.5, py: 0 }}>
          {menuItems.map((item) => {
            const active = isActive(item.path);
            const IconComponent = item.icon;
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 2,
                    py: 1,
                    px: 2,
                    position: 'relative',
                    '&::before': active
                      ? {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 3,
                          height: '60%',
                          bgcolor: '#dc2626',
                          borderRadius: '0 2px 2px 0',
                        }
                      : {},
                    bgcolor: active ? 'rgba(220, 38, 38, 0.15)' : 'transparent',
                    '&:hover': {
                      bgcolor: active ? 'rgba(220, 38, 38, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      color: active ? '#dc2626' : 'rgba(255, 255, 255, 0.7)',
                      transition: 'color 0.2s ease-in-out',
                    }}
                  >
                    <IconComponent fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: active ? 600 : 500,
                      color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.8)',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Logout Section */}
      <Box
        sx={{
          px: 1.5,
          py: 1.5,
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            py: 1,
            px: 2,
            bgcolor: 'transparent',
            '&:hover': {
              bgcolor: 'rgba(220, 38, 38, 0.1)',
            },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 40,
              color: 'rgba(255, 255, 255, 0.7)',
            }}
          >
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Çıkış Yap"
            primaryTypographyProps={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.8)',
            }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', height: '100vh', overflow: 'hidden' }}>
      {/* Top AppBar - Only for mobile */}
      <AppBar
        position="fixed"
        sx={{
          width: { xs: '100%', sm: `calc(100% - ${drawerWidth}px)` },
          left: { xs: 0, sm: `${drawerWidth}px` },
          bgcolor: '#1a1a1a',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ display: { xs: 'flex', sm: 'none' }, minHeight: '56px !important' }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, color: '#ffffff' }}>
            Admin Panel
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Sidebar Navigation */}
      <Box
        component="nav"
        sx={{
          width: { xs: 0, sm: drawerWidth },
          flexShrink: { sm: 0 },
        }}
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              height: '100vh',
              maxHeight: '100vh',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              height: '100vh',
              maxHeight: '100vh',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { xs: '100%', sm: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: '56px', sm: 0 },
          bgcolor: '#0f0f0f',
          minHeight: { xs: 'calc(100vh - 56px)', sm: '100vh' },
          height: { xs: 'calc(100vh - 56px)', sm: '100vh' },
          maxHeight: { xs: 'calc(100vh - 56px)', sm: '100vh' },
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

