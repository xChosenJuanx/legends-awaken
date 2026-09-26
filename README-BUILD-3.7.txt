BUILD 3.7 TRUE BOTH+POSE

In your existing game.js:

1) Find:
options:{lighting:'unshaded',objectTransform:'matrix',bindInverses:'matrix'}

Replace with:
options:{lighting:'unshaded',objectTransform:'both',bindInverses:'pose'}

2) Find every:
3.6 BOTH+POSE

Replace with:
3.7 TRUE BOTH+POSE

3) In service-worker.js change the cache name from:
legends-awaken-build36-both-pose-20260927

to:
legends-awaken-build37-true-both-pose-20260927

Do not replace your whole game.js with the included note file. It is only a reference.
