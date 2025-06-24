# opus

In Latin, **"opus"** means:

- **"work"** (as in a task, labor, or artistic creation)
- It can refer to a **physical effort**, a **literary/musical/artistic piece**, or even a **building/construction**.

### Grammatical info:

- **Noun (neuter)**
- Declension: **3rd**
- Singular: _opus_
- Plural: _opera_

### Common phrases:

- **"magnum opus"** – greatest work/masterpiece
- **"opus Dei"** – work of God

## the problem
are you eating right now? clearly not. But let’s say you were. you’re holding a burger in one hand and a shawarma in the other. then you wanted to open the most recent Garf510 video on YouTube for some mealtime entertainment. what would you do huh? you’d be in a real pickle wouldn’t you eh? 

you can’t open youtube without using your fingers, and you don’t want to touch your keyboard because you’ll get it dirty. what do you do?

for too long, humans have lived in a world where they can’t click youtube videos and control their computer while they’re eating two different things at once. that changes today.

## the solution
introducing opus: the ultimate, hands-free ai agent that can do ANYTHING on your computer. by using mouse and keyboard clicks as well as scripting, you can perform and automate any action using just one prompt. 

hands full? simply use your voice to send a verbal prompt, and opus will be able to transcribe your voice and execute your command.

## how it works
opus takes context from:
- your installed apps
- the current screen (screenshot)
- the last 5 actions you’ve taken
it takes this information along with your prompt and feeds it into a series of ai agents that each have specialized roles.

opus will then choose from the following actions:
- running an applescript
- clicking an accessibility ui element
- keypress
- mouse click
to accomplish your task.

opus is the FUTURE of how humans interact with your computers. now just install opus, break your keyboard in half, and eat your burgers in both hands.

_________________________

## Setup Guide

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn
- Git

### Development Setup

#### For macOS

1. Clone the repository:
```bash
git clone https://github.com/adhyaay-karnwal/opus.git
cd opus
```

2. Create a `.env` file in the root directory with required environment variables.

3. Install dependencies:
```bash
npm install
# or
yarn
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

#### For Windows

1. Clone the repository:
```bash
git clone https://github.com/adhyaay-karnwal/opus.git
cd opus
```

2. Create a `.env` file in the root directory with required environment variables.

3. Install dependencies:
```bash
npm install
# or
yarn install
```

4. Modify the `dev` script in package.json to work on Windows:
Replace:
```json
"dev": "source .env && vite --host"
```
With:
```json
"dev": "vite --host"
```

5. Start the development server:
```bash
npm run dev
# or
yarn dev
```

### Production Build

#### For macOS

1. Ensure all dependencies are installed:
```bash
npm install
# or
yarn
```

2. Build the application:
```bash
npm run build
# or
yarn build
```

The built application will be available in the `dist` directory.

#### For Windows

1. Ensure all dependencies are installed:
```bash
npm install
# or
yarn
```

2. Modify the `build` script in package.json to work on Windows:
Replace:
```json
"build": "source .env && tsc && vite build && electron-builder"
```
With:
```json
"build": "tsc && vite build && electron-builder"
```

3. Build the application:
```bash
npm run build
# or
yarn build
```

The built application will be available in the `dist` directory.

### Additional Notes

- The application uses Electron for desktop integration
- TypeScript is used for type safety
- Vite is used as the build tool
- TailwindCSS is used for styling
- The application requires environment variables to be set properly for full functionality

### Troubleshooting

1. If you encounter any issues with environment variables on Windows, consider using cross-env or manually setting the environment variables.

2. For build issues:
   - Make sure all dependencies are properly installed
   - Clear the `dist` directory before rebuilding
   - Check that all required environment variables are set

3. For development issues:
   - Make sure ports are not being used by other applications
   - Check console for any error messages
   - Ensure Node.js version compatibility
