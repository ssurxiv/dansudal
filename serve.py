#!/usr/bin/env python3
"""
개발용 로컬 서버. 파일을 고칠 때마다 브라우저가 옛 버전을 캐시에서
꺼내 쓰는 걸 막으려고 모든 응답에 no-store 를 붙입니다.
사용법: python serve.py [포트, 기본 8000]
"""
import http.server
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    http.server.test(HandlerClass=NoCacheHandler, port=port)
