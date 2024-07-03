import subprocess
from PIL import Image
from pdf2image import convert_from_path
import os
import time
import logging

logging.basicConfig(filename='/home/admin/media_display.log', level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def log_and_print(message):
    print(message)
    logging.info(message)

def play_video(video_path):
    try:
     subprocess.run(['vlc', '--play-and-exit', '--fullscreen','--avcodec-hw=mmal', video_path])
    except Exception as e:
     log_and_print(f"Error playing video {video_path}: {e}")
    

def display_image(image_path):
     try:
        process = subprocess.Popen(['feh', '--fullscreen', '--auto-zoom', image_path])
        time.sleep(10)
        process.terminate()
        process.wait()
     except Exception as e:
        log_and_print(f"Error displaying image {image_path}: {e}")
        subprocess.run(['pkill', '-f', 'feh'])

def display_pdf(pdf_path):
    try: 
     pages = convert_from_path(pdf_path)
     for page_num, page in enumerate(pages):
        page_path = f"/tmp/page_{page_num}.png"
        page.save(page_path, 'PNG')
        display_image(page_path)
    except Exception as e:
        log_and_print(f"Error displaying PDF {pdf_path}: {e}")

def is_supported_file(file_path):
    supported_formats = ['.mp4', '.jpg', '.png', '.pdf']
    return any(file_path.endswith(ext) for ext in supported_formats)

def main():
    media_directory = "/home/admin/BDD"  # Répertoire contenant les fichiers multimédias

    while True:
        for root, dirs, files in os.walk(media_directory):
            for file in files:
                file_path = os.path.join(root, file)
                if not is_supported_file(file_path):
                    log_and_print(f"Unsupported file format: {file_path}")
                    continue
                log_and_print(f"Processing file: {file_path}")
                try:
                    if file_path.endswith('.mp4'):
                        play_video(file_path)
                    elif file_path.endswith('.jpg') or file_path.endswith('.png'):
                        display_image(file_path)
                    elif file_path.endswith('.pdf'):
                        display_pdf(file_path)
                    else:
                        print(f"Unsupported file format: {file_path}")
                except Exception as e:
                    print(f"Error processing file {file_path}: {e}")

        print("Restarting loop...")
        time.sleep(2)

if __name__ == "__main__":
    main()

