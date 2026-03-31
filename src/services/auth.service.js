/**
 * DoctorCopilot Auth Service
 * Handles API communication for authentication and registration.
 */

const API_BASE_URL = '/api/v1/auth';

export const authService = {
  /**
   * Register a new patient
   * @param {Object} data - Patient registration data
   * @returns {Promise<Object>} The created patient profile
   */
  registerPatient: async (data) => {
    try {
      const response = await fetch(`${API_BASE_URL}/register/patient`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Registration Error:', error);
      throw error;
    }
  },

  /**
   * Login user and store token
   * @param {Object} credentials - Email and Password
   * @returns {Promise<Object>} Token response
   */
  login: async (credentials) => {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
      }
      return data;
    } catch (error) {
      console.error('Login Error:', error);
      throw error;
    }
  },

  /**
   * Get current user profile
   * @returns {Promise<Object>} User profile
   */
  getMe: async () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token found');

    const response = await fetch(`${API_BASE_URL}/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to fetch user profile');
    return await response.json();
  },

  /**
   * Get current patient specific profile
   * @returns {Promise<Object>} Patient profile
   */
  getPatientProfile: async () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token found');

    const response = await fetch('/api/v1/patients/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to fetch patient profile');
    return await response.json();
  },

  /**
   * Logout user
   */
  logout: () => {
    localStorage.removeItem('token');
  }
};

export default authService;
