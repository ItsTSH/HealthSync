import axios from 'axios';
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const getAllRecords = async (accessToken) => {
  const response = await axios.get(`${BASE_URL}/records`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
};