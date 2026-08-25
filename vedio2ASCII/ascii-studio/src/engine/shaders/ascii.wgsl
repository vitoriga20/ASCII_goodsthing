struct AsciiUniforms {
	density: f32,
	glyphScale: f32,
	brightness: f32,
	contrast: f32,
	threshold: f32,
	invert: f32,
	edgeStrength: f32,
	colourMode: f32,
}

@group(0) @binding(0) var<uniform> u: AsciiUniforms;
@group(0) @binding(1) var src: texture_2d<f32>;
@group(0) @binding(2) var dst: texture_storage_2d<rgba16float, write>;

fn luminance(colour: vec3f) -> f32 {
	return dot(colour, vec3f(0.2126, 0.7152, 0.0722));
}

fn glyphMask(local: vec2f, level: f32) -> f32 {
	let distanceFromCentre = length(local - vec2f(0.5));
	let horizontal = step(0.44, local.x) * step(local.x, 0.56);
	let vertical = step(0.44, local.y) * step(local.y, 0.56);
	let diagonalA = step(abs(local.x - local.y), 0.10);
	let diagonalB = step(abs((1.0 - local.x) - local.y), 0.10);
	let ring = step(0.20, distanceFromCentre) * step(distanceFromCentre, 0.38);
	if (level < 1.0) { return 0.0; }
	if (level < 2.0) { return horizontal; }
	if (level < 3.0) { return max(horizontal, vertical); }
	if (level < 4.0) { return max(max(horizontal, vertical), diagonalA); }
	if (level < 5.0) { return max(max(horizontal, vertical), max(diagonalA, diagonalB)); }
	if (level < 6.0) { return max(ring, max(horizontal, vertical)); }
	return 1.0;
}

fn outputColour(source: vec3f, mask: f32) -> vec3f {
	if (u.colourMode < 0.5) { return source * mask; }
	if (u.colourMode < 1.5) { return vec3f(0.18, 0.95, 0.62) * mask; }
	if (u.colourMode < 2.5) { return vec3f(1.0, 0.72, 0.27) * mask; }
	return vec3f(mask);
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3u) {
	let dimensions = textureDimensions(src);
	if (gid.x >= dimensions.x || gid.y >= dimensions.y) { return; }

	let aspect = f32(dimensions.x) / f32(dimensions.y);
	let cellCountX = max(1.0, u.density * aspect);
	let cellSize = vec2f(f32(dimensions.x) / cellCountX, f32(dimensions.y) / u.density);
	let cell = floor(vec2f(gid.xy) / cellSize);
	let centre = vec2u(min(vec2f(dimensions - vec2u(1u)), (cell + vec2f(0.5)) * cellSize));
	let centreColour = textureLoad(src, centre, 0);
	let right = textureLoad(src, vec2u(min(centre.x + 1u, dimensions.x - 1u), centre.y), 0);
	let down = textureLoad(src, vec2u(centre.x, min(centre.y + 1u, dimensions.y - 1u)), 0);
	var value = clamp((luminance(centreColour.rgb) + u.brightness) * u.contrast, 0.0, 1.0);
	let edge = abs(luminance(right.rgb) - luminance(centreColour.rgb)) + abs(luminance(down.rgb) - luminance(centreColour.rgb));
	value = clamp(value + edge * u.edgeStrength, 0.0, 1.0);
	if (u.invert > 0.5) { value = 1.0 - value; }
	value = select(value, step(u.threshold, value), u.threshold > 0.0);
	let local = fract(vec2f(gid.xy) / cellSize);
	let scaled = clamp((local - vec2f(0.5)) / u.glyphScale + vec2f(0.5), 0.0, 1.0);
	let mask = glyphMask(scaled, floor(value * 7.0));
	textureStore(dst, gid.xy, vec4f(outputColour(centreColour.rgb, mask), centreColour.a));
}
