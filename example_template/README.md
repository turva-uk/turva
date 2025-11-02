# Example template

This is a test thingy to check out Jinja templating and how we could apply it.

For templates, all we need to do is store the JSON array of answers and the git commit hash of the template, bind the two together and we can build the template with the given values.

## How to use

1.  Create Python3 venv (optional but recommended):

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

2.  Install dependencies:

    ```bash
    pip install -r requirements.txt
    ```

3.  Run the build script:

    ```bash
    python build.py
    ```

4.  The generated files will be in the `output` directory.
