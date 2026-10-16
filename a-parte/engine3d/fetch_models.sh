#!/bin/sh
# Rigged human models from the three.js examples (Mixamo skeletons); kept out of the repository.
cd "$(dirname "$0")/models" || exit 1
for m in Xbot Michelle Soldier readyplayer.me kira; do
  curl -sSL -o "$m.glb" "https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/models/gltf/$m.glb"
done
curl -sSL -o HVGirl.glb "https://raw.githubusercontent.com/BabylonJS/Assets/master/meshes/HVGirl.glb"
