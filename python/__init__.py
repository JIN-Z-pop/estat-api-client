# -*- coding: utf-8 -*-
"""
e-Stat API Client
~~~~~~~~~~~~~~~~~

A Python client for Japanese government statistics from e-Stat.

Basic usage:
    >>> from estat_client import EStatClient
    >>> client = EStatClient(api_key="your-api-key")
    >>> data = client.fetch("population", years=[2022])

Full documentation at https://github.com/JIN-Z-pop/estat-api-client
"""

from .estat_client import EStatClient, EStatClientError, PREFECTURE_CODES

__version__ = "1.0.0"
__author__ = "JIN-Z-pop and his merry AI brothers"
__all__ = ["EStatClient", "EStatClientError", "PREFECTURE_CODES"]
