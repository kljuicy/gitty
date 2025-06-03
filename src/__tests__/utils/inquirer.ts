/* istanbul ignore file */
/**
 * Inquirer testing utilities
 */

/**
 * Helper to mock inquirer prompt responses with type safety
 */
export const mockInquirerResponses = (
  inquirerMock: { prompt: any },
  responses: any[]
) => {
  responses.forEach((response, index) => {
    if (index === 0) {
      inquirerMock.prompt.mockResolvedValueOnce(response);
    } else {
      inquirerMock.prompt.mockResolvedValueOnce(response);
    }
  });
};
