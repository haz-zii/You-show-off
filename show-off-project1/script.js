// BUTTON VIDEO HOVER EFFECTS
// Get references to the start button and the video element inside it
const startButton = document.getElementById('startButton');
const buttonVideo = document.querySelector('.button-video');

// When user hovers over the button, start playing the video
// This creates the effect where the video appears as background on hover
startButton.addEventListener('mouseenter', function() {
    buttonVideo.play();
});

// When user stops hovering over the button, pause the video and reset it
// This ensures the video starts from the beginning each time they hover
startButton.addEventListener('mouseleave', function() {
    buttonVideo.pause();
    buttonVideo.currentTime = 0; // Reset video to the very beginning
});

// PAGE TRANSITION ON BUTTON CLICK
// When user clicks the start button, create a smooth transition effect
startButton.addEventListener('click', function() {
    // Apply a fade-out transition to the entire page body
    // This makes the page smoothly disappear instead of an instant change
    document.body.style.transition = 'opacity 0.5s ease-out';
    document.body.style.opacity = '0';
    
    // Wait for the fade transition to complete, then navigate to the next page
    // The 500ms delay matches the 0.5s transition duration above
    setTimeout(function() {
        window.location.href = 'show-off-project/index.html';
    }, 500);
});
