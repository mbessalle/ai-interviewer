import {
  createResponse,
  deleteResponse,
  emailHasResponded,
  getAllResponses,
  getResponseByCallId,
  getResponseCountByOrganizationId,
  saveResponse,
} from "./responses.actions";

export const ResponseService = {
  createResponse,
  saveResponse,
  updateResponse: saveResponse,
  getAllResponses,
  getResponseByCallId,
  deleteResponse,
  getResponseCountByOrganizationId,
  emailHasResponded,
};
