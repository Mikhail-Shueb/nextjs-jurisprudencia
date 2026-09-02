FROM node:20.10-bookworm-slim

RUN apt update && apt install vim cron git -y

RUN useradd -m clitools

RUN passwd -d clitools

RUN mkdir -p /etc/cron.d/ && touch /etc/cron.d/cron.allow && echo "root\nclitools" > /etc/cron.d/cron.allow

USER clitools

WORKDIR /home/clitools

# util to convert between versions
RUN git clone https://github.com/stjiris/version-converter && cd version-converter && npm install && npm run build

# DGSI ETL — crawls the public DGSI site, built once at image build time, executed by cron.
# Pinned to v13-migration: main is still on jurisprudencia-document v11 and would target the
# wrong index. Drop "-b v13-migration" once that branch is merged into main.
RUN git clone -b v13-migration https://github.com/stjiris/jurisprudencia-etl && cd jurisprudencia-etl && npm install && npm run build
# Incremental crawl every 3rd hour from 9 through 18 on weekdays
RUN (crontab -l; echo "0 9-18/3 * * 1-5 cd /home/clitools/jurisprudencia-etl && /usr/local/bin/node dist >> ../jurisprudencia-etl.stdout.log 2>> ../jurisprudencia-etl.stderr.log") | crontab -
# Full crawl at 04:30 on Saturday
RUN (crontab -l; echo "30 4 * * 6 cd /home/clitools/jurisprudencia-etl && /usr/local/bin/node dist --full >> ../jurisprudencia-etl.full.stdout.log 2>> ../jurisprudencia-etl.full.stderr.log") | crontab -
# Consume trigger queue daily at 19:00
RUN (crontab -l; echo "0 19 * * * cd /home/clitools/jurisprudencia-etl && /usr/local/bin/node dist/consume-trigger >> ../jurisprudencia-etl.trigger.stdout.log 2>> ../jurisprudencia-etl.trigger.stderr.log") | crontab -

# no build needed here
RUN git clone https://github.com/stjiris/backup-jurisprudencia && cd backup-jurisprudencia && npm install
#   At 10:00 on Sunday.
RUN (crontab -l; echo "0 10 * * 0 cd /home/clitools/backup-jurisprudencia && /usr/local/bin/node cli backup jurisprudencia.13.0,users.0.0,keys-info.0.0 >> ../backup-jurisprudencia.full.stdout.log 2>> ../backup-jurisprudencia.full.stderr.log") | crontab -

# update rss feed
RUN git clone https://github.com/stjiris/jurisprudencia-rss.git && cd jurisprudencia-rss && npm install && npm run build
# At minute 45 past every 3rd hour from 9 through 18 on every day-of-week from Monday through Friday.
RUN (crontab -l; echo "45 9-18/3 * * 1-5 cd /home/clitools/jurisprudencia-rss && /usr/local/bin/node dist >> ../jurisprudencia-rss.stdout.log 2>> ../jurisprudencia-rss.stderr.log") | crontab -


COPY entrypoint.sh .

USER root

ENTRYPOINT ["./entrypoint.sh"]
