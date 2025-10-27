# Dorm Laundry Queue App.

A simple web app to manage a single washing machine queue in a dorm. Users can join the queue, see who's up next, set their expected finish time, and everyone can see the live status. The creator (admin) can mark "Washing" and "Done," and advance the queue.

## Features

- **Join Queue**: Users can add themselves to the laundry queue with one click
- **Real-time Updates**: Changes propagate to all connected clients
- **Queue Management**: Users can see their position and estimated time
- **Admin Controls**: Start washing, mark done, and manage the queue
- **Time Zone Support**: All times display in Asia/Bishkek (UTC+6) timezone
- **Responsive Design**: Mobile-friendly interface

## Tech Stack

- **Next.js**: React framework with server-side rendering
- **Supabase**: Database, authentication, and real-time subscriptions
- **TailwindCSS**: Utility-first CSS framework
- **date-fns**: Date manipulation with timezone support

## Setup Instructions

### Prerequisites

1. [Node.js](https://nodejs.org/) (v16 or newer)
2. [Supabase](https://supabase.com/) account (free tier works great)

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_ADMIN_KEY=your_admin_key
```

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `NEXT_PUBLIC_ADMIN_KEY`: Custom key to access admin features (default: 'admin')

### Database Setup

1. Create a new Supabase project
2. Set up the following tables in Supabase SQL Editor:

```sql
-- Create queue table
CREATE TABLE IF NOT EXISTS public.queue (
  id UUID PRIMARY KEY,
  userId TEXT NOT NULL,
  userName TEXT NOT NULL,
  userRoom TEXT,
  joinedAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  plannedStartAt TIMESTAMP WITH TIME ZONE,
  expectedFinishAt TIMESTAMP WITH TIME ZONE,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
);

-- Create machine_state table
CREATE TABLE IF NOT EXISTS public.machine_state (
  id SERIAL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'idle',
  currentQueueItemId UUID,
  startedAt TIMESTAMP WITH TIME ZONE,
  expectedFinishAt TIMESTAMP WITH TIME ZONE
);

-- Create history table
CREATE TABLE IF NOT EXISTS public.history (
  id UUID PRIMARY KEY,
  userId TEXT NOT NULL,
  userName TEXT NOT NULL,
  userRoom TEXT,
  startedAt TIMESTAMP WITH TIME ZONE NOT NULL,
  finishedAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert initial machine state
INSERT INTO public.machine_state (status) 
VALUES ('idle') 
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

-- Add policies for public access
CREATE POLICY "Allow public read access" ON public.queue FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.machine_state FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.history FOR SELECT USING (true);

-- Add policies for insert, update, delete
CREATE POLICY "Allow authenticated insert access" ON public.queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update access" ON public.queue FOR UPDATE WITH CHECK (true);
CREATE POLICY "Allow authenticated delete access" ON public.queue FOR DELETE USING (true);

CREATE POLICY "Allow authenticated insert access" ON public.machine_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update access" ON public.machine_state FOR UPDATE WITH CHECK (true);

CREATE POLICY "Allow authenticated insert access" ON public.history FOR INSERT WITH CHECK (true);
```

3. Enable realtime in Supabase project settings for all tables

### Local Development

1. Clone the repository
2. Install dependencies
   ```bash
   npm install
   ```
3. Run the development server
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000)

## Deployment on Vercel

### Option 1: Deploy with Vercel Button

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/import?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Fdorm-laundry-queue&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,NEXT_PUBLIC_ADMIN_KEY&project-name=dorm-laundry-queue&repository-name=dorm-laundry-queue)

### Option 2: Manual Deployment

1. Push your code to a GitHub repository

2. Connect to Vercel:
   ```bash
   npm i -g vercel
   vercel login
   vercel
   ```

3. Add environment variables in the Vercel project settings

## Usage Instructions

### Regular Users

1. Enter your name and optional room number
2. Click "Join Queue" to add yourself to the laundry queue
3. View your position in the queue
4. Set your expected finish time when it's your turn

### Admins

1. Enter the admin key to access admin controls
2. Use "Start Washing" to begin a washing cycle for a queue entry
3. Use "Mark Done" when a cycle is completed
4. Use "Start Next" to move to the next person in queue
5. Use "Clear Queue" to remove all entries from the queue

## License

MIT
