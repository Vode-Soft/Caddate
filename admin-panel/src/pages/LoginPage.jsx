import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Fade,
  Zoom,
  Divider,
} from '@mui/material';
import { 
  Lock as LockIcon, 
  Email as EmailIcon,
  Visibility,
  VisibilityOff,
  AdminPanelSettings,
  Shield,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Giriş yapılırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #0f0f0f 100%)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-50%',
          right: '-20%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(220, 38, 38, 0.15) 0%, transparent 70%)',
          animation: 'float 20s ease-in-out infinite',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: '-30%',
          left: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(220, 38, 38, 0.1) 0%, transparent 70%)',
          animation: 'float 25s ease-in-out infinite reverse',
        },
        '@keyframes float': {
          '0%, 100%': {
            transform: 'translate(0, 0) scale(1)',
          },
          '33%': {
            transform: 'translate(30px, -50px) scale(1.1)',
          },
          '66%': {
            transform: 'translate(-20px, 20px) scale(0.9)',
          },
        },
      }}
    >
      {/* Sol Panel - Brand & Info */}
      <Box
        sx={{
          flex: 1,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 4,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Zoom in={mounted} timeout={800}>
          <Box sx={{ textAlign: 'center', maxWidth: 500 }}>
            <Box
              sx={{
                width: 120,
                height: 120,
                margin: '0 auto',
                borderRadius: '30px',
                background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 4,
                boxShadow: '0 20px 60px rgba(220, 38, 38, 0.4)',
                animation: 'pulse 3s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': {
                    transform: 'scale(1)',
                    boxShadow: '0 20px 60px rgba(220, 38, 38, 0.4)',
                  },
                  '50%': {
                    transform: 'scale(1.05)',
                    boxShadow: '0 25px 70px rgba(220, 38, 38, 0.6)',
                  },
                },
              }}
            >
              <AdminPanelSettings sx={{ color: 'white', fontSize: 70 }} />
            </Box>
            
            <Typography 
              variant="h3" 
              sx={{ 
                mb: 2,
                fontWeight: 800,
                background: 'linear-gradient(135deg, #dc2626 0%, #f87171 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em',
              }}
            >
              CaddateApp
            </Typography>
            
            <Typography 
              variant="h5" 
              sx={{ 
                mb: 3,
                color: 'text.secondary',
                fontWeight: 300,
              }}
            >
              Yönetim Paneli
            </Typography>

            <Divider sx={{ my: 4, borderColor: 'rgba(220, 38, 38, 0.2)' }} />

            <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Shield sx={{ fontSize: 40, color: '#dc2626', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Güvenli Erişim
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <LockIcon sx={{ fontSize: 40, color: '#dc2626', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Şifreli Bağlantı
                </Typography>
              </Box>
            </Box>
          </Box>
        </Zoom>
      </Box>

      {/* Sağ Panel - Login Form */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 3,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Container maxWidth="sm">
          <Fade in={mounted} timeout={1000}>
            <Paper
              elevation={0}
              sx={{
                padding: { xs: 3, sm: 5 },
                background: 'rgba(26, 26, 26, 0.8)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(220, 38, 38, 0.2)',
                borderRadius: 4,
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: 'rgba(220, 38, 38, 0.4)',
                  boxShadow: '0 25px 70px rgba(220, 38, 38, 0.2)',
                },
              }}
            >
              {/* Mobile Logo */}
              <Box
                sx={{
                  display: { xs: 'flex', md: 'none' },
                  justifyContent: 'center',
                  mb: 3,
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 30px rgba(220, 38, 38, 0.4)',
                  }}
                >
                  <AdminPanelSettings sx={{ color: 'white', fontSize: 45 }} />
                </Box>
              </Box>

              <Typography 
                variant="h4" 
                sx={{ 
                  mb: 1,
                  fontWeight: 700,
                  textAlign: 'center',
                  color: 'white',
                }}
              >
                Admin Girişi
              </Typography>
              
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ mb: 4, textAlign: 'center' }}
              >
                Devam etmek için hesap bilgilerinizi girin
              </Typography>

              {error && (
                <Fade in timeout={300}>
                  <Alert 
                    severity="error" 
                    sx={{ 
                      mb: 3,
                      borderRadius: 2,
                      '& .MuiAlert-icon': {
                        fontSize: 24,
                      },
                    }}
                  >
                    {error}
                  </Alert>
                </Fade>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Adresi"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(220, 38, 38, 0.5)',
                        },
                      },
                      '&.Mui-focused': {
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#dc2626',
                          borderWidth: 2,
                        },
                      },
                    },
                  }}
                />
                
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Şifre"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="şifre görünürlüğünü değiştir"
                          onClick={handleClickShowPassword}
                          edge="end"
                          disabled={loading}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(220, 38, 38, 0.5)',
                        },
                      },
                      '&.Mui-focused': {
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#dc2626',
                          borderWidth: 2,
                        },
                      },
                    },
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{ 
                    py: 1.8,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    borderRadius: 2,
                    textTransform: 'none',
                    background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                    boxShadow: '0 8px 24px rgba(220, 38, 38, 0.4)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      boxShadow: '0 12px 32px rgba(220, 38, 38, 0.6)',
                      transform: 'translateY(-2px)',
                    },
                    '&:active': {
                      transform: 'translateY(0)',
                    },
                    '&.Mui-disabled': {
                      background: 'rgba(220, 38, 38, 0.3)',
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={26} color="inherit" />
                  ) : (
                    'Giriş Yap'
                  )}
                </Button>
              </Box>

              <Box
                sx={{
                  mt: 4,
                  pt: 3,
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                }}
              >
                <Shield sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Sadece yetkili admin kullanıcıları erişebilir
                </Typography>
              </Box>
            </Paper>
          </Fade>
        </Container>
      </Box>
    </Box>
  );
}

