FROM python:3.9.12

COPY  . /opt/AI_chrome
WORKDIR /opt/AI_chrome


RUN pip install -r requirements.txt
ENV FLASK_APP=addchat/flask-server/app.py

EXPOSE 5000
CMD ["flask", "run", "-h", "0.0.0.0", "-p", "5000"]