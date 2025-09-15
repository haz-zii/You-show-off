
// This is a MOUTH TRAP game built with HTML5 Canvas and vanilla JavaScript
// The game features a tongue that navigates through teeth obstacles in a mouth-themed environment
// References: Flappy Bird mechanics, HTML5 Canvas API, Game development patterns

// in colabboration with NIKKIE TAN


(function () {
	'use strict';

	// CANVAS SETUP AND CONTEXT INITIALIZATION	
	// Get the main game canvas element and its 2D rendering context
	// This is where all the game graphics will be drawn
	/** @type {HTMLCanvasElement} */
	const canvas = document.getElementById('game');
	const ctx = canvas.getContext('2d');
	
	// Get the landing page canvas element and its 2D rendering context
	// This canvas is used for the start screen before the game begins
	/** @type {HTMLCanvasElement} */
	const landingCanvas = document.getElementById('landing-canvas');
	const landingCtx = landingCanvas.getContext('2d');
	
	// Landing page state - controls whether to show the start screen or the game
	// When true: shows landing page, when false: shows the actual game
	let showLanding = true;

	// CANVAS RESIZING AND RESPONSIVE DESIGN	
	// Function to resize both canvases to maintain proper aspect ratio
	// This ensures the game looks good on different screen sizes
	// Reference: Responsive web design principles, Canvas API documentation
	function resizeCanvas() {
		// Calculate desired width - use full viewport width but minimum 320px for mobile
		const desiredWidth = Math.max(320, Math.floor(window.innerWidth));
		
		// Calculate height based on 2:3 aspect ratio (width:height)
		// This maintains the game's intended proportions
		const desiredHeightByAspect = Math.floor((3 / 2) * desiredWidth);
		
		// Don't exceed the viewport height - clamp to screen size
		const maxHeight = window.innerHeight;
		const desiredHeight = Math.min(desiredHeightByAspect, maxHeight);
		
		// Update main game canvas if dimensions changed
		if (canvas.width !== desiredWidth || canvas.height !== desiredHeight) {
			canvas.width = desiredWidth;
			canvas.height = desiredHeight;
		}
		
		// Update landing canvas to match main canvas dimensions
		if (landingCanvas.width !== desiredWidth || landingCanvas.height !== desiredHeight) {
			landingCanvas.width = desiredWidth;
			landingCanvas.height = desiredHeight;
		}
	}
	
	// Initialize canvas size when page loads
	resizeCanvas();
	
	// Listen for window resize events to make the game responsive
	// This ensures the game adapts when user resizes browser window
	window.addEventListener('resize', function () {
		resizeCanvas();
		// Redraw the current screen with new dimensions
		if (showLanding) {
			drawLanding(); // Redraw landing page
		} else {
			draw(); // Redraw game
		}
	});


	// IMAGE ASSETS LOADING AND MANAGEMENT	
	// Background texture loading with fallback system
	// This creates a repeating pattern for the game background
	// Reference: HTML5 Canvas patterns, Image loading best practices
	let bgPattern = null; // Canvas pattern object for repeating background
	let bgImg = null;     // The actual image data
	
	// Immediately invoked function expression (IIFE) to load background texture
	// This pattern ensures the loading happens as soon as the script runs
	(function loadBackgroundTexture() {
		const img = new Image();
		let triedJpg = false; // Flag to prevent infinite retry loop
		
		// Success callback when image loads
		img.onload = function () {
			bgImg = img; // Store the loaded image
			try {
				// Create a repeating pattern from the image for seamless background
				bgPattern = ctx.createPattern(img, 'repeat');
			} catch (_) {
				// If pattern creation fails, set to null (fallback to solid color)
				bgPattern = null;
			}
			// Redraw landing page when background loads to show the texture
			if (showLanding) {
				drawLanding();
			}
		};
		
		// Error callback - try JPG if PNG fails
		img.onerror = function () {
			if (!triedJpg) {
				triedJpg = true;
				img.src = 'backgroundtexture.jpg'; // Fallback to JPG format
			}
		};
		
		// Start loading with PNG first (better quality, smaller file size)
		img.src = 'backgroundtexture.png';
	})();

	// Ground/teeth image loading
	// This represents the bottom of the mouth with teeth
	const groundImg = new Image();
	let groundLoaded = false; // Track loading state
	
	groundImg.onload = function () { 
		groundLoaded = true;
		// Redraw landing page when ground loads to show the teeth
		if (showLanding) {
			drawLanding();
		}
	};
	groundImg.src = 'teethbackground.png';

	// Mouth/tongue image loading
	// The main character is a tongue instead of a traditional bird
	const mouthImg = new Image();
	mouthImg.src = 'tongue-img.png';

	// Optional additional tongue image support
	// This allows for dynamic tongue images from the HTML DOM
	// Reference: DOM manipulation, optional image handling
	/** @type {HTMLImageElement|null} */
	const tongueImg = (function(){
		const el = document.getElementById('tongue-img');
		// Return the element only if it exists and is an image
		return el instanceof HTMLImageElement ? el : null;
	})();

	// GAME CONSTANTS AND CONFIGURATION
	
	// Physics and gameplay constants
	// These values control the game's feel and difficulty
	// Reference: Game design principles, physics simulation basics
	const GRAVITY = 0.45;           // How fast the mouth falls (pixels per frame)
	const FLAP_STRENGTH = -7.5;     // How much upward force a flap provides (negative = up)
	const PIPE_GAP_MIN = 140;       // Minimum space between top and bottom pipes
	const PIPE_GAP_MAX = 200;       // Maximum space between top and bottom pipes
	const PIPE_WIDTH = 70;          // Width of each pipe (teeth)
	const PIPE_INTERVAL_MS = 1400;  // Time between new pipes spawning (milliseconds)
	const SCROLL_SPEED = 2.6;       // How fast everything moves left (pixels per frame)
	const MOUTH_SIZE = 32;          // Size of the mouth/tongue sprite
	const GROUND_HEIGHT = 80;       // Height of the ground/teeth area

	// GAME STATE VARIABLES	
	// Tongue position and physics
	let mouthY = canvas.height / 2;  // Vertical position (starts at center)
	let mouthX = canvas.width * 0.28; // Horizontal position (28% from left)
	let mouthVelY = 0;               // Vertical velocity (speed of falling/rising)
	
	// Teeth management
	let pipes = [];                 // Array storing all active teeth obstacles
	let lastPipeAt = 0;             // Timestamp of last teeth spawn
	
	// Scoring and game state
	let score = 0;                  // Current game score
	let best = Number(localStorage.getItem('mouth_trap_best') || 0); // Best score from localStorage
	let isRunning = false;          // Whether the game loop is active
	let isGameOver = false;         // Whether the game has ended
	let lastTimestamp = 0;          // Last frame timestamp for smooth animation
	let backgroundOffset = 0;       // Background scroll position for parallax effect

	// CORE GAME FUNCTIONS

	// Reset all game state to initial values
	// Called when starting a new game or restarting after game over
	// Reference: Game state management, initialization patterns
	function resetGame() {
		mouthY = canvas.height / 2;     // Reset tongue to center vertically
		mouthX = canvas.width * 0.28;   // Reset tongue to 28% from left
		mouthVelY = 0;                  // Stop all vertical movement
		pipes = [];                    // Clear all teeth obstacles
		lastPipeAt = 0;                // Reset teeth spawn timer
		score = 0;                     // Reset score to zero
		isGameOver = false;            // Mark game as active
		backgroundOffset = 0;          // Reset background scroll position
	}

	// Handle tongue movement (jumping) action
	// This is the main player input function
	// Reference: Input handling, game loop initialization
	function flap() {
		// If game isn't running yet, start it
		if (!isRunning) {
			isRunning = true;
			lastTimestamp = performance.now(); // Record start time
			requestAnimationFrame(gameLoop);   // Begin game loop
		}
		
		// If game is over, restart instead of moving
		if (isGameOver) {
			resetGame();
			return;
		}
		
		// Apply upward force to the tongue
		mouthVelY = FLAP_STRENGTH; // Negative value = upward movement
	}

	// Create a new teeth obstacle
	// Generates random gap size and position within safe bounds
	// Reference: Procedural generation, collision detection setup
	function spawnPipe() {
		// Calculate random gap size between min and max
		const gap = PIPE_GAP_MIN + Math.random() * (PIPE_GAP_MAX - PIPE_GAP_MIN);
		
		// Define safe boundaries for teeth placement
		const topLimit = 40;                                    // Minimum distance from top
		const bottomLimit = canvas.height - GROUND_HEIGHT - 40 - gap; // Maximum distance from ground
		
		// Randomly position the top teeth within safe bounds
		const topHeight = topLimit + Math.random() * (bottomLimit - topLimit);
		
		// Start teeth off-screen to the right
		const x = canvas.width + PIPE_WIDTH;
		
		// Add new teeth to the pipes array
		pipes.push({
			x,                    // Horizontal position
			width: PIPE_WIDTH,    // Teeth width
			topHeight,            // Height of top teeth
			gap,                  // Space between top and bottom teeth
			passed: false,        // Whether tongue has passed this teeth (for scoring)
		});
	}

	// Check if two rectangles overlap (collision detection)
	// Used to detect tongue collision with teeth and ground
	// Reference: AABB (Axis-Aligned Bounding Box) collision detection
	function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
		// Standard AABB collision formula
		// Two rectangles overlap if they intersect on both X and Y axes
		return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
	}

	function update(dt) {
		if (isGameOver) return;

		// Physics
		mouthVelY += GRAVITY;
		mouthY += mouthVelY;

		// Ground and ceiling
		if (mouthY < 0) {
			mouthY = 0;
			mouthVelY = 0;
		}
		const groundY = canvas.height - GROUND_HEIGHT - MOUTH_SIZE;
		if (mouthY > groundY) {
			mouthY = groundY;
			isGameOver = true;
		}

		// Pipes
		backgroundOffset = (backgroundOffset + SCROLL_SPEED) % canvas.width;
		for (let i = pipes.length - 1; i >= 0; i--) {
			const p = pipes[i];
			p.x -= SCROLL_SPEED;
			if (p.x + p.width < -10) {
				pipes.splice(i, 1);
				continue;
			}

			// Scoring when mouth passes pipe center
			const mouthCenter = mouthX + MOUTH_SIZE / 2;
			const pipeCenter = p.x + p.width / 2;
			if (!p.passed && pipeCenter < mouthCenter) {
				p.passed = true;
				score++;
				if (score > best) {
					best = score;
					localStorage.setItem('mouth_trap_best', String(best));
				}
			}

			// Collision
			const mouthTop = mouthY;
			const mouthBottom = mouthY + MOUTH_SIZE;
			const topRectCollide = rectsOverlap(
				mouthX,
				mouthTop,
				MOUTH_SIZE,
				MOUTH_SIZE,
				p.x,
				0,
				p.width,
				p.topHeight
			);
			const bottomRectCollide = rectsOverlap(
				mouthX,
				mouthTop,
				MOUTH_SIZE,
				MOUTH_SIZE,
				p.x,
				p.topHeight + p.gap,
				p.width,
				canvas.height - GROUND_HEIGHT - (p.topHeight + p.gap)
			);
			if (topRectCollide || bottomRectCollide) {
				isGameOver = true;
			}
		}

		// Spawn pipes
		lastPipeAt += dt;
		if (lastPipeAt > PIPE_INTERVAL_MS) {
			spawnPipe();
			lastPipeAt = 0;
		}
	}

	function draw() {
		// Background (covers entire canvas including ground)
		if (bgPattern) {
			ctx.globalAlpha = 0.6;
			ctx.fillStyle = bgPattern;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.globalAlpha = 1.0;
		} else {
			// Fallback sky
			ctx.fillStyle = '#70c5ce';
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle = '#8be0ec';
			for (let x = 0; x < canvas.width; x += 120) {
				ctx.fillRect(x, 120, 60, 10);
			}
		}

		// Ground (teeth strip over background)
		if (typeof groundImg !== 'undefined' && groundImg.complete) {
			ctx.drawImage(groundImg, 0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
		}

		// Top teeth strip (flipped vertically)
		if (typeof groundImg !== 'undefined' && groundImg.complete) {
			ctx.save();
			ctx.scale(1, -1);
			ctx.drawImage(groundImg, 0, -GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
			ctx.restore();
		}

		// Pipes
		for (const p of pipes) {
			ctx.fillStyle = '#fff200';
			ctx.fillRect(p.x, 0, p.width, p.topHeight);
			ctx.fillRect(
				p.x,
				p.topHeight + p.gap,
				p.width,
				canvas.height - GROUND_HEIGHT - (p.topHeight + p.gap)
			);
			// Pipe lips
			ctx.fillStyle = '#e0c700';
			ctx.fillRect(p.x - 4, p.topHeight - 10, p.width + 8, 10);
			ctx.fillRect(p.x - 4, p.topHeight + p.gap, p.width + 8, 10);
		}

		// Mouth
		ctx.save();
		ctx.translate(mouthX + MOUTH_SIZE / 2, mouthY + MOUTH_SIZE / 2);
		const tilt = Math.max(-0.5, Math.min(1.0, mouthVelY / 9));
		ctx.rotate(tilt);
		if (mouthImg.complete) {
			ctx.drawImage(mouthImg, -MOUTH_SIZE / 2, -MOUTH_SIZE / 2, MOUTH_SIZE, MOUTH_SIZE);
		} else {
			// Fallback vector mouth
			ctx.fillStyle = '#ffd166';
			ctx.beginPath();
			ctx.arc(0, 0, MOUTH_SIZE / 2, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = '#000';
			ctx.beginPath();
			ctx.arc(MOUTH_SIZE / 6, -MOUTH_SIZE / 6, 3, 0, Math.PI * 2);
			ctx.fill();
			// Tongue overlay only in fallback mode
			const tongueW = 12;
			const tongueH = 8;
			const tongueX = MOUTH_SIZE / 2 - 4;
			const tongueY = -tongueH / 2;
			if (tongueImg && tongueImg.complete) {
				try {
					ctx.drawImage(tongueImg, tongueX, tongueY, tongueW, tongueH);
				} catch (_) {
					ctx.fillStyle = '#ff6b6b';
					ctx.fillRect(tongueX, tongueY, tongueW, tongueH);
				}
			} else {
				ctx.fillStyle = '#ff6b6b';
				ctx.fillRect(tongueX, tongueY, tongueW, tongueH);
			}
		}
		ctx.restore();

		// UI
		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 32px Orbitron, system-ui, -apple-system, Segoe UI, Arial';
		ctx.textAlign = 'left';
		ctx.fillText('SCORE: ' + score, 18, canvas.height / 2 - 20);
		ctx.fillText('BEST: ' + best, 18, canvas.height / 2 + 20);

		if (!isRunning) {
			ctx.textAlign = 'center';
			ctx.font = 'bold 24px Roboto, system-ui, -apple-system, Segoe UI, Arial';
			ctx.fillText('CLICK OR PRESS SPACE TO START', canvas.width / 2, canvas.height * 0.42);
		}

		if (isGameOver) {
			ctx.textAlign = 'center';
			ctx.font = 'bold 36px Orbitron, system-ui, -apple-system, Segoe UI, Arial';
			ctx.fillStyle = '#ffffff';
			ctx.fillText('GAME OVER', canvas.width / 2, canvas.height * 0.45);
			ctx.font = 'bold 20px Roboto, system-ui, -apple-system, Segoe UI, Arial';
			ctx.fillText('CLICK OR PRESS SPACE TO RESTART', canvas.width / 2, canvas.height * 0.52);
		}
	}

	function gameLoop(timestamp) {
		const dt = Math.min(50, timestamp - lastTimestamp);
		lastTimestamp = timestamp;
		update(dt);
		draw();
		if (isRunning) requestAnimationFrame(gameLoop);
	}

	// Input
	function onKeyDown(e) {
		if (e.code === 'Space' || e.key === ' ') {
			e.preventDefault();
			flap();
		}
	}
	function onPointer() {
		flap();
	}
	document.addEventListener('keydown', onKeyDown);
	canvas.addEventListener('mousedown', onPointer);
	canvas.addEventListener('touchstart', function (e) {
		e.preventDefault();
		onPointer();
	}, { passive: false });

	// Landing page drawing function
	function drawLanding() {
		// Clear canvas first
		landingCtx.clearRect(0, 0, landingCanvas.width, landingCanvas.height);
		
		// Background (static, covers entire canvas)
		if (bgPattern) {
			landingCtx.globalAlpha = 0.6;
			landingCtx.fillStyle = bgPattern;
			landingCtx.fillRect(0, 0, landingCanvas.width, landingCanvas.height);
			landingCtx.globalAlpha = 1.0;
		} else if (bgImg && bgImg.complete) {
			// Draw background image directly if pattern creation failed
			landingCtx.globalAlpha = 0.6;
			landingCtx.drawImage(bgImg, 0, 0, landingCanvas.width, landingCanvas.height);
			landingCtx.globalAlpha = 1.0;
		} else {
			// Fallback sky (only show if no images loaded yet)
			landingCtx.fillStyle = '#70c5ce';
			landingCtx.fillRect(0, 0, landingCanvas.width, landingCanvas.height);
			landingCtx.fillStyle = '#8be0ec';
			for (let x = 0; x < landingCanvas.width; x += 120) {
				landingCtx.fillRect(x, 120, 60, 10);
			}
		}

		// Ground (teeth strip over background)
		if (groundImg && groundImg.complete) {
			landingCtx.drawImage(groundImg, 0, landingCanvas.height - GROUND_HEIGHT, landingCanvas.width, GROUND_HEIGHT);
		}

		// Top teeth strip (flipped vertically)
		if (groundImg && groundImg.complete) {
			landingCtx.save();
			landingCtx.scale(1, -1);
			landingCtx.drawImage(groundImg, 0, -GROUND_HEIGHT, landingCanvas.width, GROUND_HEIGHT);
			landingCtx.restore();
		}

		// Title
		landingCtx.fillStyle = '#ffffff';
		landingCtx.font = 'bold 4rem Orbitron, system-ui, -apple-system, Segoe UI, Arial';
		landingCtx.textAlign = 'center';
		landingCtx.shadowColor = 'rgba(0,0,0,0.5)';
		landingCtx.shadowBlur = 4;
		landingCtx.shadowOffsetX = 2;
		landingCtx.shadowOffsetY = 2;
		landingCtx.fillText('MOUTH TRAP', landingCanvas.width / 2, landingCanvas.height * 0.4);

		// Subtitle
		landingCtx.font = 'bold 1.2rem Roboto, system-ui, -apple-system, Segoe UI, Arial';
		landingCtx.shadowBlur = 2;
		landingCtx.shadowOffsetX = 1;
		landingCtx.shadowOffsetY = 1;
		landingCtx.fillText('CLICK ANYWHERE TO START PLAYING!', landingCanvas.width / 2, landingCanvas.height * 0.5);

		// Start button background
		const buttonWidth = 200;
		const buttonHeight = 60;
		const buttonX = (landingCanvas.width - buttonWidth) / 2;
		const buttonY = landingCanvas.height * 0.6;

		// Button background (just yellow, no shadow or border)
		landingCtx.fillStyle = '#fff200';
		landingCtx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

		// Button text
		landingCtx.fillStyle = '#000000';
		landingCtx.font = 'bold 1.5rem Orbitron, system-ui, -apple-system, Segoe UI, Arial';
		landingCtx.shadowColor = 'transparent';
		landingCtx.shadowBlur = 0;
		landingCtx.shadowOffsetX = 0;
		landingCtx.shadowOffsetY = 0;
		landingCtx.fillText('START GAME', landingCanvas.width / 2, buttonY + buttonHeight / 2 + 8);
	}

	// Start game function
	function startGame() {
		showLanding = false;
		document.getElementById('landing-page').style.display = 'none';
		document.getElementById('game-container').style.display = 'block';
		// Initialize game
		draw();
	}

	// Landing page event listeners
	landingCanvas.addEventListener('click', startGame);
	landingCanvas.addEventListener('touchstart', function(e) {
		e.preventDefault();
		startGame();
	}, { passive: false });

	// Wait for images to load before showing landing page
	function waitForImages() {
		if ((bgImg && bgImg.complete) || (groundImg && groundImg.complete)) {
			drawLanding();
		} else {
			// Show loading state
			landingCtx.fillStyle = '#0b1820';
			landingCtx.fillRect(0, 0, landingCanvas.width, landingCanvas.height);
			landingCtx.fillStyle = '#ffffff';
			landingCtx.font = 'bold 2rem Roboto, system-ui, -apple-system, Segoe UI, Arial';
			landingCtx.textAlign = 'center';
			landingCtx.fillText('LOADING...', landingCanvas.width / 2, landingCanvas.height / 2);
			setTimeout(waitForImages, 100);
		}
	}
	
	// Start loading process
	waitForImages();
})();

