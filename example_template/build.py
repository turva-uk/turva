from jinja2 import Environment
from glob import glob
import json
import logging
import os
import random
import shutil


def generate_random_file_name() -> str:
    """Generate a random alphanumeric file name."""
    chars = "abcdefghijklmnopqrstuvwxyz0123456789"
    return "".join(random.choice(chars) for _ in range(12))


# Set up logging
logging.basicConfig(level=logging.INFO)

template_files = glob("template/*.md")
variables = json.load(open("values.json"))
output_dir = "build/"

# Delete the build directory if it exists
if os.path.exists(output_dir):
    shutil.rmtree(output_dir)

# Ensure output directory exists
os.makedirs(output_dir)
os.makedirs(f"{output_dir}/hazards")

# Create a Jinja2 environment with custom delimiters to avoid conflicts with markdown
# Using @@ instead of {{ }} to avoid conflicts with common markdown/code patterns
env = Environment(trim_blocks=True, lstrip_blocks=True)

for file_path in template_files:
    # Skip hazard template, we'll deal with it separately
    if file_path.endswith("hazard_template.md"):
        continue

    logging.info(f"Processing template: {file_path}")

    # Read the template file
    with open(file_path, "r") as file:
        template_content = file.read()

    # Render the template with Jinja2
    template = env.from_string(template_content)
    # Pass the variables to the template
    rendered_content = template.render(variables)

    # Write the rendered content to the output directory
    output_path = output_dir + file_path.split("/")[-1]
    with open(output_path, "w") as output_file:
        output_file.write(rendered_content)

    logging.info(f"Successfully wrote: {output_path}")

# Process hazard templates separately for each hazard

for index, hazard in enumerate(variables.get("hazards", [])):
    hazard_template_path = "template/hazard_template.md"
    logging.info(
        f"Processing hazard template for: {hazard.get('hazard_name', 'Unnamed Hazard')}"
    )

    # Read the hazard template file
    with open(hazard_template_path, "r") as file:
        hazard_template_content = file.read()

    # Render the hazard template with Jinja2
    hazard_template = env.from_string(hazard_template_content)
    # Pass the specific hazard data to the template
    rendered_hazard_content = hazard_template.render(hazard)

    # Write the rendered hazard content to the output directory
    hazard_output_path = f"{output_dir}/hazards/{index}_hazard.md"
    with open(hazard_output_path, "w") as output_file:
        output_file.write(rendered_hazard_content)

    logging.info(f"Successfully wrote: {hazard_output_path}")
