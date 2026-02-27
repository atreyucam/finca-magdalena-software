@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\compose.ps1" prod %*
