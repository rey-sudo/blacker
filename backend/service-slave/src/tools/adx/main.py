import sys
import json
import time
from adx import average_directional_index
from has_blue_color import has_blue_color


def main():
    try:
        input_data = sys.stdin.read()
        data = json.loads(input_data)

        average_directional_index(klines=data['klines'], mark=data['mark'], filename=data['filename'], show=data['show'])

        time.sleep(3)

        result = has_blue_color(image_rel_path=data['filename'])
        
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
