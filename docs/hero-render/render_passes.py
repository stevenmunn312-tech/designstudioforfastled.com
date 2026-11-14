"""Render every light group of workbench.blend to its own denoised EXR.

Run: blender -b out/workbench.blend --python render_passes.py -- <pass_dir> <percent> <samples>
"""
import bpy, sys, os, time

args = sys.argv[sys.argv.index("--") + 1:]
out_dir, percent, samples = args[0], int(args[1]), int(args[2])
os.makedirs(out_dir, exist_ok=True)
scene = bpy.context.scene
vl = scene.view_layers[0]
scene.render.resolution_percentage = percent
scene.cycles.samples = samples
scene.render.use_compositing = True
scene.render.threads_mode = 'AUTO'

ng = bpy.data.node_groups.new("Light group export", "CompositorNodeTree")
scene.compositing_node_group = ng
rl = ng.nodes.new("CompositorNodeRLayers")
rl.scene = scene
fo = ng.nodes.new("CompositorNodeOutputFile")
fo.directory = out_dir
fo.file_name = ""
fo.format.media_type = 'IMAGE'
fo.format.file_format = 'OPEN_EXR'
fo.format.color_depth = '32'
fo.format.exr_codec = 'ZIP'
fo.format.color_mode = 'RGB'

albedo = rl.outputs["Denoising Albedo"]
normal = rl.outputs["Denoising Normal"]
for g in vl.lightgroups:
    src = rl.outputs["Combined_" + g.name]
    dn = ng.nodes.new("CompositorNodeDenoise")
    ng.links.new(src, dn.inputs["Image"])
    ng.links.new(albedo, dn.inputs["Albedo"])
    ng.links.new(normal, dn.inputs["Normal"])
    item = fo.file_output_items.new('RGBA', g.name)
    ng.links.new(dn.outputs["Image"], fo.inputs[g.name])
# camera depth, used to keep the matrix recolour behind foreground objects
fo.file_output_items.new('FLOAT', "depth")
ng.links.new(rl.outputs["Depth"], fo.inputs["depth"])

out = ng.interface.new_socket("Image", in_out='OUTPUT', socket_type='NodeSocketColor')
go = ng.nodes.new("NodeGroupOutput")
ng.links.new(rl.outputs["Image"], go.inputs[0])

t = time.time()
bpy.ops.render.render(write_still=False)
print(f"RENDER OK {time.time() - t:.1f}s", os.listdir(out_dir)[:5])
