import { Request } from 'express';

export interface PublicRequest extends Request {}

export interface RoleRequest extends PublicRequest {
  currentRoleCodes: string[];
}

export interface ProtectedRequest extends RoleRequest {}
