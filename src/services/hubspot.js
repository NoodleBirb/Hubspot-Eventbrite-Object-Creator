require('dotenv').config();
const { Client } = require('@hubspot/api-client');

const hubspotClient = new Client({ accessToken: process.env.HUBSPOT_API_TOKEN });

/**
 * Create a Course (Training) object in HubSpot
 * @param {Object} courseData - The course properties
 * @param {string} courseData.name - Course name
 * @param {string} courseData.hs_course_date - Course date
 * @param {string} courseData.description - Course description (optional)
 * @returns {Promise<Object>} - The created course object
 */
async function createCourse(courseData) {
  try {
    console.log('Creating course with data:', JSON.stringify(courseData, null, 2));
    const response = await hubspotClient.crm.objects.basicApi.create('courses', {
      properties: courseData
    });
    return response;
  } catch (error) {
    console.error('Error creating course:', error.message);
    if (error.response && error.response.body) {
      console.error('Response body:', error.response.body);
    }
    throw error;
  }
}

/**
 * Get a course by name and date to check for duplicates
 * @param {string} name - Course name
 * @param {string} date - Course date
 * @returns {Promise<Object|null>} - The course object if found, null otherwise
 */
async function getCourseByNameAndDate(name, date) {
  try {
    const response = await hubspotClient.crm.objects.searchApi.doSearch('courses', {
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'name',
              operator: 'EQ',
              value: name
            },
            {
              propertyName: 'hs_course_date',
              operator: 'EQ',
              value: date
            }
          ]
        }
      ],
      limit: 1
    });
    
    return response.results && response.results.length > 0 ? response.results[0] : null;
  } catch (error) {
    console.error('Error searching for course:', error.message);
    throw error;
  }
}

/**
 * Get all courses to verify creation
 * @param {number} limit - Number of courses to retrieve
 * @returns {Promise<Array>} - Array of course objects
 */
async function getCourses(limit = 10) {
  try {
    const response = await hubspotClient.crm.objects.basicApi.getPage('courses', limit);
    return response.results;
  } catch (error) {
    console.error('Error fetching courses:', error.message);
    throw error;
  }
}

module.exports = {
  createCourse,
  getCourseByNameAndDate,
  getCourses
};
