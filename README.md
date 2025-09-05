# eyeDHD
This is the eye tracking tool to be used for the Psych Department in diagnosing ADHD with objective data.

<h2>Overview</h2>
<p>
  The Psychology Department at Fresno State has been conducting a study utilizing a mixed reality simulation to find a way to diagnose ADHD using objective data, as opposed to subjective data.
</p>
<p>
  The test subjects are in a room consisting of walls painted green and a desk. They put on a Varjo XR-4 headset and a set of headphones. Once the simulation starts, the test subject is inside a classroom and sits through a 20-25 minute lecture on ethics. 
</p>
<h3>Experiment Elements</h3>
<p>
  During the simulated lecture, there are distractors that happen at specific times, for example, people entering and exiting, loud phone notifications, and various loud noises you may hear in the classroom. These distractions have Hit Boxes located at the source of the distractor, these are not visible to the test subject.
</p>
<p>
  The data extracted from the headset are the eye movements, pupil dialation, and these measurements can let us know when the test subject gazes at the distractor, for how long, etc.
</p>
<h3>Current Data</h3>
<p>
  The Psychology Department currently has 104 runs that have been performed. These runs consist of the raw data that consists of 250,000 data points each. Along with the data, they also have the video captured from the headset from the viewpoint of the test subject with the eye movements superimposed on the video.
</p>
<h2>Our Role</h2>
<p>
  Within the datasets obtained, there are values for Pupil Dialations that are not currently being evaluated. We will be coming up with a way to correlate Pupil Dialation combined with the eye movements to establish objective data to better diagnose ADHD.
</p>
<h3>Concept of the Tool</h3>
<p>
  We want to provide a tool for the Psychology Department where they can upload raw or cleaned data, along with the video. From the data, create an algorithm that takes the data and creates a graphical representation of the eyes displaying the pupils and iris, along with the numerical data for the Pupil Dialation in real time synced with the the timestamps.
</p>
<p>
  Once the pupil video is created, the user can sync up the videos based on the frame number obtained from the datasets, and save each individual case for future reference
</p>
<h3>Needed Features</h3>
<ul>
  <li>Form for uploading csv, video file, case attributes (TestID, QuestionairreScore, IsADHD, etc)</li>
  <li>Editor for combining Mixed-Reality video with the eye graphics</li>
  <li>Database for storing each case once completed</li>
  <li>Interface to compare 1 or 2 different case videos</li>
  <li>Interface to generate graphs for different cases showing saccads and pupil dialation</li>
</ul>