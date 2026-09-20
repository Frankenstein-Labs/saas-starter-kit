import { Role } from '@prisma/client';

type RoleType = (typeof Role)[keyof typeof Role];
export type Action = 'create' | 'update' | 'read' | 'delete' | 'leave';
export type Resource =
  | 'team'
  | 'team_member'
  | 'team_invitation'
  | 'team_sso'
  | 'team_dsync'
  | 'team_audit_log'
  | 'team_webhook'
  | 'team_payments'
  | 'team_api_key'
  | 'ai_project'
  | 'ai_workspace'
  | 'ai_notebook'
  | 'ai_model'
  | 'ai_dataset'
  | 'ai_training'
  | 'ai_deployment'
  | 'ai_integration';

type RolePermissions = {
  [role in RoleType]: Permission[];
};

export type Permission = {
  resource: Resource;
  actions: Action[] | '*';
};

export const availableRoles = [
  { id: Role.MEMBER, name: 'Member' },
  { id: Role.ADMIN, name: 'Admin' },
  { id: Role.OWNER, name: 'Owner' },
];

const allAiResources: Permission[] = [
  { resource: 'ai_project', actions: '*' },
  { resource: 'ai_workspace', actions: '*' },
  { resource: 'ai_notebook', actions: '*' },
  { resource: 'ai_model', actions: '*' },
  { resource: 'ai_dataset', actions: '*' },
  { resource: 'ai_training', actions: '*' },
  { resource: 'ai_deployment', actions: '*' },
  { resource: 'ai_integration', actions: '*' },
];

export const permissions: RolePermissions = {
  OWNER: [
    { resource: 'team', actions: '*' },
    { resource: 'team_member', actions: '*' },
    { resource: 'team_invitation', actions: '*' },
    { resource: 'team_sso', actions: '*' },
    { resource: 'team_dsync', actions: '*' },
    { resource: 'team_audit_log', actions: '*' },
    { resource: 'team_payments', actions: '*' },
    { resource: 'team_webhook', actions: '*' },
    { resource: 'team_api_key', actions: '*' },
    ...allAiResources,
  ],
  ADMIN: [
    { resource: 'team', actions: '*' },
    { resource: 'team_member', actions: '*' },
    { resource: 'team_invitation', actions: '*' },
    { resource: 'team_sso', actions: '*' },
    { resource: 'team_dsync', actions: '*' },
    { resource: 'team_audit_log', actions: '*' },
    { resource: 'team_webhook', actions: '*' },
    { resource: 'team_api_key', actions: '*' },
    ...allAiResources,
  ],
  MEMBER: [
    { resource: 'team', actions: ['read', 'leave'] },
    { resource: 'ai_project', actions: ['read', 'create'] },
    { resource: 'ai_workspace', actions: ['read', 'create', 'update'] },
    { resource: 'ai_notebook', actions: ['read', 'create', 'update'] },
    { resource: 'ai_model', actions: ['read', 'create'] },
    { resource: 'ai_dataset', actions: ['read', 'create'] },
    { resource: 'ai_training', actions: ['read', 'create'] },
    { resource: 'ai_deployment', actions: ['read'] },
  ],
};
