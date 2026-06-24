FROM elastalert/elastalert:0.2.4

COPY config.yaml /opt/elastalert/config.yaml
COPY rules/ /opt/elastalert/rules/

CMD ["elastalert", "--config", "/opt/elastalert/config.yaml"]
