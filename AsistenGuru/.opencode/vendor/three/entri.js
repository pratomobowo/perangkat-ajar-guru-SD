// Bundel three.js r162 yang dipakai media 3D Asisten Guru (hanya kelas yang dipakai, supaya HTML kecil).
// Dibangun ulang: bun build entri.js --minify --format=iife --target=browser --outfile=three-sd.min.js
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, BoxGeometry, CylinderGeometry, ConeGeometry, SphereGeometry,
  BufferGeometry, Float32BufferAttribute, MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial, LineSegments,
  EdgesGeometry, AmbientLight, DirectionalLight, HemisphereLight, Vector3, Color, Raycaster, Vector2, Shape, ShapeGeometry,
  CanvasTexture, Sprite, SpriteMaterial, DoubleSide, Quaternion, Matrix4, Box3, MathUtils, SRGBColorSpace,
} from "three"
window.THREE = {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, BoxGeometry, CylinderGeometry, ConeGeometry, SphereGeometry,
  BufferGeometry, Float32BufferAttribute, MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial, LineSegments,
  EdgesGeometry, AmbientLight, DirectionalLight, HemisphereLight, Vector3, Color, Raycaster, Vector2, Shape, ShapeGeometry,
  CanvasTexture, Sprite, SpriteMaterial, DoubleSide, Quaternion, Matrix4, Box3, MathUtils, SRGBColorSpace,
}
