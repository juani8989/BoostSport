import { pgTable, text, timestamp, boolean, jsonb, serial, integer, primaryKey, unique } from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

export const profiles = pgTable('profiles', {
  userId: text('userId').primaryKey(),
  role: text('role').notNull(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  authorName: text('authorName').notNull(),
  kind: text('kind').notNull(),
  body: text('body').notNull(),
  mediaUrl: text('mediaUrl'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const reactions = pgTable(
  'reactions',
  {
    targetId: text('targetId').notNull(),
    userId: text('userId').notNull(),
    kind: text('kind').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.targetId, t.userId, t.kind] })],
)

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  targetId: text('targetId').notNull(),
  userId: text('userId').notNull(),
  authorName: text('authorName').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const reports = pgTable(
  'reports',
  {
    targetId: text('targetId').notNull(),
    userId: text('userId').notNull(),
    reason: text('reason').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.targetId, t.userId] })],
)

export const follows = pgTable(
  'follows',
  {
    followerId: text('followerId').notNull(),
    targetId: text('targetId').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.followerId, t.targetId] })],
)

export const swipes = pgTable(
  'swipes',
  {
    userId: text('userId').notNull(),
    targetId: text('targetId').notNull(),
    liked: boolean('liked').notNull(),
    pitch: text('pitch'),
    challengeId: text('challengeId'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.targetId] })],
)

export const matches = pgTable(
  'matches',
  {
    id: serial('id').primaryKey(),
    athleteKey: text('athleteKey').notNull(),
    orgKey: text('orgKey').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (t) => [unique().on(t.athleteKey, t.orgKey)],
)

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  matchId: integer('matchId').notNull(),
  senderKey: text('senderKey').notNull(),
  kind: text('kind').notNull().default('text'),
  body: text('body').notNull(),
  meta: jsonb('meta'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const userSettings = pgTable('user_settings', {
  userId: text('userId')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull().default({}),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

/** Optional audio track of a post (a song or voice clip the author uploaded). */
export const postAudio = pgTable('post_audio', {
  postId: integer('postId').primaryKey(),
  audioUrl: text('audioUrl').notNull(),
  audioName: text('audioName').notNull().default(''),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})
